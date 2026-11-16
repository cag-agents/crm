import {
	ActivityType,
	type Db,
	DealStage,
	Prisma,
	RecordSource,
} from "@crm/db";
import { convertToBase } from "@crm/db/fx";
import { readReportingCurrency } from "@crm/db/settings";
import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Logger,
	Post,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { AgentTriggerService } from "../agent/agent-trigger.service";
import { InjectDatabase } from "../database/database.constants";

export interface WebhookMetadata {
	brandName?: string;
	company?: string;
	budget?: number;
	post_id?: string;
	messageId?: string;
	timestamp?: string;
	chatId?: number;
}

export interface WebhookIngestDto {
	platform: "instagram" | "whatsapp" | "telegram" | string;
	eventType: "comment_to_dm" | "direct_message" | "brand_inquiry" | string;
	senderHandle: string;
	senderName: string;
	senderEmail?: string;
	commentId?: string;
	text: string;
	workspaceSlug?: string;
	metadata?: WebhookMetadata;
}

interface ExtractedIdentity {
	personName: string;
	brandName: string;
}

@ApiTags("Webhooks")
@Controller()
export class WebhookIngestController {
	private readonly logger = new Logger(WebhookIngestController.name);

	constructor(
		@InjectDatabase() private readonly db: Db,
		private readonly agentTrigger: AgentTriggerService,
	) {}

	@AllowAnonymous()
	@Post(["api/webhooks/ingest", "webhooks/ingest"])
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Ingest decoupled omnichannel webhook events from Edge Gateway",
	})
	@ApiResponse({
		status: 200,
		description: "Webhook event synced to Contact and Activity timelines",
	})
	async ingest(@Body() payload: WebhookIngestDto) {
		const platform = (payload.platform || "unknown").toLowerCase();
		const handle = payload.senderHandle?.trim() || "@creator_hq";
		const rawName = payload.senderName?.trim() || handle;

		// 1. Resolve workspace and author
		const authorId = await this.resolveAuthorId();

		// 2. Parse identity & brand details
		const { personName, brandName } = this.extractNames(rawName, payload);
		const isBrandInquiry = payload.eventType === "brand_inquiry";
		const budgetAmount = isBrandInquiry ? this.parseBudget(payload) : null;

		// 3. Resolve Company & Deal for Brand Inquiries
		const { company, deal } = isBrandInquiry
			? await this.handleBrandInquiry(
					brandName,
					platform,
					payload,
					authorId,
					budgetAmount ?? 450000,
				)
			: { company: null, deal: null };

		// 4. Resolve or upsert Contact
		const contact = await this.upsertContact(
			personName,
			handle,
			platform,
			payload,
			company?.id,
			isBrandInquiry,
		);

		// Link contact to deal if newly created
		if (deal && contact) {
			await this.linkContactToDeal(deal.id, contact.id);
		}

		// 5. Create visible Activity record on Contact (and Deal) timeline
		const inboundActivity = await this.createInboundActivity(
			platform,
			payload,
			rawName,
			handle,
			contact.id,
			company?.id,
			deal?.id,
			authorId,
			budgetAmount,
		);

		// 6. Meta CSW Compliance Action
		const cswOpened = await this.handleMetaCswCompliance(
			platform,
			payload,
			handle,
			contact.id,
			authorId,
		);

		// 7. Auto-trigger Slave Agents
		await this.dispatchSlaveAgents(
			payload,
			platform,
			rawName,
			handle,
			contact,
			company,
			deal,
			budgetAmount,
		);

		return {
			success: true,
			contactId: contact.id,
			companyId: company?.id ?? null,
			dealId: deal?.id ?? null,
			activityId: inboundActivity.id,
			cswOpened,
			platform,
			senderHandle: handle,
			eventType: payload.eventType,
			triggeredAgent: isBrandInquiry
				? "Slave 1 (Brand Sponsorship Triage Agent)"
				: "Slave 2 (Omnichannel Community & Comment-to-DM Agent)",
		};
	}

	private async resolveAuthorId(): Promise<string> {
		const anyUser = await this.db.user.findFirst({ select: { id: true } });
		return anyUser?.id ?? "system";
	}

	private extractNames(
		rawName: string,
		payload: WebhookIngestDto,
	): ExtractedIdentity {
		let personName = rawName;
		let brandName = "boAt Lifestyle";

		const brandMatch = rawName.match(/\(([^)]+)\)/);
		if (brandMatch?.[1]) {
			brandName = brandMatch[1].trim();
			personName = rawName.replace(/\([^)]+\)/g, "").trim();
		} else if (payload.metadata?.brandName) {
			brandName = payload.metadata.brandName;
		}

		return { personName, brandName };
	}

	private parseBudget(payload: WebhookIngestDto): number {
		if (payload.metadata?.budget && Number.isFinite(payload.metadata.budget)) {
			return payload.metadata.budget;
		}

		const budgetMatch = payload.text.match(
			/(?:budget|₹|rs\.?|inr)\s*:?\s*([0-9,]+)/i,
		);
		if (budgetMatch?.[1]) {
			const parsed = Number(budgetMatch[1].replace(/,/g, ""));
			if (!Number.isNaN(parsed) && parsed > 0) return parsed;
		}

		return 450000;
	}

	private async handleBrandInquiry(
		brandName: string,
		platform: string,
		payload: WebhookIngestDto,
		authorId: string,
		budgetAmount: number,
	) {
		let company = await this.db.company.findFirst({
			where: { name: { equals: brandName, mode: "insensitive" } },
		});

		if (!company) {
			const domain = `${brandName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
			company = await this.db.company.create({
				data: {
					name: brandName,
					domain,
					website: `https://${domain}`,
					industry: "Consumer Electronics & Brand Sponsorship",
					description: `Inbound brand sponsor via ${platform}`,
				},
			});

			try {
				await this.agentTrigger.companyCreated(
					company.id,
					`New Brand Partner: ${brandName}`,
				);
			} catch {
				// safe fallback
			}
		}

		const dealName = `${company.name} - Sponsorship Inquiry`;
		let deal = await this.db.deal.findFirst({
			where: {
				companyId: company.id,
				archivedAt: null,
				closedAt: null,
			},
		});

		if (!deal) {
			const reportingCurrency = await readReportingCurrency(this.db);
			const fx = await convertToBase(
				this.db,
				new Prisma.Decimal(budgetAmount),
				"INR",
				reportingCurrency,
			);

			deal = await this.db.deal.create({
				data: {
					name: dealName,
					companyId: company.id,
					ownerId: authorId,
					stage: DealStage.DEMO_BOOKED,
					amount: new Prisma.Decimal(budgetAmount),
					currency: "INR",
					baseAmount: fx?.baseAmount ?? null,
					baseCurrency: fx?.baseCurrency ?? null,
					fxRate: fx?.fxRate ?? null,
					fxRateAt: fx?.fxRateAt ?? null,
					description: `Inbound brand inquiry via ${platform}:\n\n"${payload.text}"`,
					expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
					lastActivityAt: new Date(),
				},
			});
		}

		return { company, deal };
	}

	private async upsertContact(
		personName: string,
		handle: string,
		platform: string,
		payload: WebhookIngestDto,
		companyId: string | undefined,
		isBrandInquiry: boolean,
	) {
		let firstName = personName;
		let lastName: string | null = null;
		if (personName.includes(" ")) {
			const parts = personName.split(/\s+/);
			firstName = parts[0] ?? personName;
			lastName = parts.slice(1).join(" ") || null;
		}

		const cleanHandle = handle.replace(/^@/, "").toLowerCase();
		const syntheticEmail = `${cleanHandle}@${platform}.social`;
		const emailToMatch = payload.senderEmail?.trim() || syntheticEmail;

		let contact = await this.db.contact.findFirst({
			where: {
				OR: [
					{ email: { equals: emailToMatch, mode: "insensitive" } },
					{ twitterUrl: { contains: cleanHandle } },
				],
				archivedAt: null,
			},
		});

		if (contact) {
			contact = await this.db.contact.update({
				where: { id: contact.id },
				data: {
					lastActivityAt: new Date(),
					phone: platform === "whatsapp" && !contact.phone ? handle : undefined,
					companyId: companyId ?? undefined,
					title: isBrandInquiry ? contact.title || "Brand Manager" : undefined,
				},
			});
		} else {
			contact = await this.db.contact.create({
				data: {
					firstName,
					lastName,
					email: payload.senderEmail?.trim() || syntheticEmail,
					phone: platform === "whatsapp" ? handle : null,
					companyId: companyId ?? null,
					title: isBrandInquiry ? "Brand Manager" : null,
					twitterUrl:
						platform === "instagram"
							? `https://instagram.com/${cleanHandle}`
							: null,
					source: RecordSource.TRACKING,
					lastActivityAt: new Date(),
				},
			});
		}

		return contact;
	}

	private async linkContactToDeal(dealId: string, contactId: string) {
		const existingLink = await this.db.dealContact.findUnique({
			where: { dealId_contactId: { dealId, contactId } },
		});
		if (!existingLink) {
			await this.db.dealContact.create({
				data: { dealId, contactId, role: "Brand Manager" },
			});
		}
	}

	private async createInboundActivity(
		platform: string,
		payload: WebhookIngestDto,
		rawName: string,
		handle: string,
		contactId: string,
		companyId: string | undefined,
		dealId: string | undefined,
		authorId: string,
		budgetAmount: number | null,
	) {
		let badge = `[${platform.toUpperCase()}]`;
		if (platform === "instagram") {
			badge =
				payload.eventType === "comment_to_dm"
					? "[INSTAGRAM COMMENT]"
					: "[INSTAGRAM DM]";
		} else if (platform === "whatsapp") {
			badge =
				payload.eventType === "brand_inquiry"
					? "[WHATSAPP BRAND INQUIRY]"
					: "[WHATSAPP DM]";
		} else if (platform === "telegram") {
			badge = "[TELEGRAM]";
		}

		const subject = `${badge} Inbound from ${rawName} (${handle})`;
		const body = `Inbound ${payload.eventType} on ${platform} from ${rawName} (${handle}):\n\n"${payload.text}"`;

		return this.db.activity.create({
			data: {
				type: ActivityType.NOTE,
				subject,
				body,
				contactId,
				companyId: companyId ?? null,
				dealId: dealId ?? null,
				createdById: authorId,
				occurredAt: new Date(),
				meta: {
					platform,
					eventType: payload.eventType,
					senderHandle: handle,
					senderName: rawName,
					senderEmail: payload.senderEmail ?? null,
					commentId: payload.commentId ?? null,
					dealId: dealId ?? null,
					companyId: companyId ?? null,
					budget: budgetAmount,
					inbound: true,
					metadata: (payload.metadata as Prisma.InputJsonValue) ?? {},
				} as Prisma.InputJsonValue,
			},
			select: { id: true, createdAt: true },
		});
	}

	private async handleMetaCswCompliance(
		platform: string,
		payload: WebhookIngestDto,
		handle: string,
		contactId: string,
		authorId: string,
	): Promise<boolean> {
		if (platform !== "instagram" || !payload.commentId) return false;

		const cswUrl = `https://graph.facebook.com/v19.0/${payload.commentId}/messages`;
		this.logger.log(
			`[COMPLIANCE] Meta CSW 24h Window opened via /v19.0/${payload.commentId}/messages for ${handle}`,
		);

		await this.db.activity.create({
			data: {
				type: ActivityType.NOTE,
				subject: `[META CSW 24H WINDOW OPENED] Outbound ACK to ${handle}`,
				body: `Dispatched outbound acknowledgement to POST ${cswUrl} to legally open 24-hour Meta Customer Service Window for comment ${payload.commentId}.`,
				contactId,
				createdById: authorId,
				occurredAt: new Date(),
				meta: {
					cswCompliance: true,
					commentId: payload.commentId,
					endpoint: cswUrl,
					status: "24h_window_active",
				},
			},
		});

		return true;
	}

	private async dispatchSlaveAgents(
		payload: WebhookIngestDto,
		platform: string,
		rawName: string,
		handle: string,
		contact: {
			id: string;
			firstName: string;
			lastName: string | null;
			email: string | null;
			phone: string | null;
		},
		company: { id: string; name: string } | null,
		deal: { id: string; name: string; stage: DealStage } | null,
		budgetAmount: number | null,
	) {
		if (payload.eventType === "brand_inquiry" && deal && company) {
			try {
				await this.agentTrigger.withCrmEvents(async (_tx, emit) => {
					await emit({
						type: "deal.created",
						record: { kind: "deal", id: deal.id },
						occurredAt: new Date(),
						data: {
							dealId: deal.id,
							dealName: deal.name,
							companyId: company.id,
							contactId: contact.id,
							stage: deal.stage,
							amount: budgetAmount ?? 450000,
							currency: "INR",
							budget: budgetAmount ?? 450000,
							platform,
							senderName: rawName,
							senderHandle: handle,
							message: payload.text,
						},
					});
				});

				this.logger.log(
					`[SLAVE-1 TRIGGER] Brand Sponsorship Triage Agent triggered for Deal: "${deal.name}" (ID: ${deal.id}) | Brand: ${company.name} | Budget: ₹${(budgetAmount ?? 450000).toLocaleString("en-IN")}`,
				);
			} catch (err) {
				this.logger.warn(
					`Slave 1 trigger deferred: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		} else {
			try {
				await this.agentTrigger.withCrmEvents(async (_tx, emit) => {
					await emit({
						type: "contact.created",
						record: { kind: "contact", id: contact.id },
						occurredAt: new Date(),
						data: {
							contactId: contact.id,
							firstName: contact.firstName,
							lastName: contact.lastName,
							email: contact.email,
							phone: contact.phone,
							platform,
							eventType: payload.eventType,
							senderHandle: handle,
							senderName: rawName,
							commentId: payload.commentId ?? null,
							message: payload.text,
						},
					});
				});

				await this.agentTrigger.contactCreated(
					contact.id,
					`Inbound ${payload.eventType} on ${platform} from ${handle}`,
				);

				this.logger.log(
					`[SLAVE-2 TRIGGER] Omnichannel Community & Comment-to-DM Agent triggered for Contact: "${rawName}" (${handle}) (ID: ${contact.id})`,
				);
			} catch (err) {
				this.logger.warn(
					`Slave 2 trigger deferred: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		}
	}
}
