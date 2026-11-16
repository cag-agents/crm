import { mirror } from "../src/blob";
import { db } from "../src/client";
import { resolveFavicon } from "../src/favicon";
import { fieldKeyFromLabel } from "../src/fields-shape";
import {
	ActivityType,
	AgentActionStatus,
	AgentRunStatus,
	AgentTriggerType,
	DealStage,
	type FieldEntity,
	FieldType,
	RateSource,
} from "../src/generated/prisma/enums";
import { SETTINGS_ID } from "../src/settings";
import { seedOmnichannel } from "./seed-omnichannel";

function makeRandom(seed: number): () => number {
	let a = seed;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const random = makeRandom(20260731);

function pick<T>(items: readonly T[]): T {
	const item = items[Math.floor(random() * items.length)];
	if (item === undefined) throw new Error("pick() on an empty list");
	return item;
}

function _chance(probability: number): boolean {
	return random() < probability;
}

function integer(min: number, max: number): number {
	return min + Math.floor(random() * (max - min + 1));
}

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.now();

function daysFromNow(days: number, jitterHours = 0): Date {
	const jitter = jitterHours
		? (random() - 0.5) * jitterHours * 60 * 60 * 1000
		: 0;
	return new Date(NOW + days * DAY_MS + jitter);
}

const OWNERS = [
	{ name: "Garvit Bhojak", email: "garvit@cag-crm.com" },
	{ name: "Ada Okafor", email: "ada@trycomp.ai" },
	{ name: "Priya Raman", email: "priya@trycomp.ai" },
] as const;

type SeedCompany = {
	name: string;
	domain: string;
	industry: string;
	city: string;
	country: string;
	countryCode: string;
};

const BRANDS: readonly SeedCompany[] = [
	{
		name: "boAt Lifestyle",
		domain: "boat-lifestyle.com",
		industry: "Consumer Electronics & Audio",
		city: "New Delhi",
		country: "India",
		countryCode: "IN",
	},
	{
		name: "Zerodha Varsity",
		domain: "zerodha.com",
		industry: "FinTech & Financial Literacy",
		city: "Bengaluru",
		country: "India",
		countryCode: "IN",
	},
	{
		name: "ASUS ROG India",
		domain: "asus.com",
		industry: "Gaming Laptops & Hardware",
		city: "Mumbai",
		country: "India",
		countryCode: "IN",
	},
	{
		name: "Mamaearth",
		domain: "mamaearth.in",
		industry: "D2C Personal Care & Beauty",
		city: "Gurugram",
		country: "India",
		countryCode: "IN",
	},
	{
		name: "Scaler Academy",
		domain: "scaler.com",
		industry: "EdTech & Software Engineering",
		city: "Bengaluru",
		country: "India",
		countryCode: "IN",
	},
	{
		name: "Notion",
		domain: "notion.so",
		industry: "Productivity & Creator Tools",
		city: "San Francisco",
		country: "United States",
		countryCode: "US",
	},
];

type SpecificContact = {
	firstName: string;
	lastName: string;
	email: string;
	title: string;
	phone: string;
	companyDomain?: string;
	instagram?: string;
};

const SPECIFIC_CONTACTS: readonly SpecificContact[] = [
	{
		firstName: "Riya",
		lastName: "Sharma",
		email: "riya.sharma@boat-lifestyle.com",
		title: "Head of Creator Partnerships",
		phone: "+91 98201 11223",
		companyDomain: "boat-lifestyle.com",
		instagram: "riyasharma_boat",
	},
	{
		firstName: "Karthik",
		lastName: "Iyer",
		email: "karthik.iyer@zerodha.com",
		title: "Partnerships Lead",
		phone: "+91 98450 22334",
		companyDomain: "zerodha.com",
		instagram: "karthik_zerodha",
	},
	{
		firstName: "Vikramaditya",
		lastName: "Singh",
		email: "vikramaditya.singh@asus.com",
		title: "ROG Esports & Influencer Marketing",
		phone: "+91 98190 33445",
		companyDomain: "asus.com",
		instagram: "vikram_asus_rog",
	},
	{
		firstName: "Ananya",
		lastName: "Sen",
		email: "ananya.sen@mamaearth.in",
		title: "Brand Collaborations Manager",
		phone: "+91 98710 44556",
		companyDomain: "mamaearth.in",
		instagram: "ananya_mamaearth",
	},
	{
		firstName: "Rohan",
		lastName: "Verma",
		email: "rohan.verma@scaler.com",
		title: "Growth & Creator Outreach",
		phone: "+91 98860 55667",
		companyDomain: "scaler.com",
		instagram: "rohan_scaler",
	},
	{
		firstName: "Claire",
		lastName: "Zhang",
		email: "claire.zhang@notion.so",
		title: "Creator Community & Evangelism",
		phone: "+1 415 555 7890",
		companyDomain: "notion.so",
		instagram: "claire_notion",
	},
	// Community Superfans & Fellow Creators
	{
		firstName: "Tanmay",
		lastName: "Bhat",
		email: "tanmay@creators.network",
		title: "Macro Comedy & Tech Creator",
		phone: "+91 98200 12345",
		instagram: "thetanmay",
	},
	{
		firstName: "Shlok",
		lastName: "Srivastava",
		email: "shlok@techburner.in",
		title: "Tech Reviewer & Founder",
		phone: "+91 98111 23456",
		instagram: "techburner",
	},
	{
		firstName: "Aarav",
		lastName: "Kapoor",
		email: "aarav.kapoor@gmail.com",
		title: "Superfan & Community Lead",
		phone: "+91 97170 34567",
		instagram: "aarav_creator_fan",
	},
];

type SpecificDeal = {
	id: string;
	name: string;
	companyDomain: string;
	amountInr: number;
	stage: DealStage;
	description: string;
	expectedDays: number;
	closed: boolean;
};

const SPECIFIC_DEALS: readonly SpecificDeal[] = [
	{
		id: "seed-deal-boat-nirvana-q4",
		name: "boAt Nirvana ANC Q4 Launch Collab",
		companyDomain: "boat-lifestyle.com",
		amountInr: 450000,
		stage: DealStage.DECISION_MAKER_BOUGHT_IN, // Rate Negotiation
		description:
			"1x Dedicated YouTube Video + 2x IG Reels with Comment-to-DM automation",
		expectedDays: 14,
		closed: false,
	},
	{
		id: "seed-deal-asus-rog-zephyrus",
		name: "ASUS ROG Zephyrus Developer Review",
		companyDomain: "asus.com",
		amountInr: 600000,
		stage: DealStage.CONTRACT_SENT, // Content in Production
		description: "Long-form coding & gaming benchmark video",
		expectedDays: 7,
		closed: false,
	},
	{
		id: "seed-deal-zerodha-student-series",
		name: "Zerodha Varsity Student Finance Series",
		companyDomain: "zerodha.com",
		amountInr: 320000,
		stage: DealStage.CLOSED_WON, // Published & Paid
		description: "3x YouTube Shorts + Link-in-Bio attribution",
		expectedDays: -5,
		closed: true,
	},
	{
		id: "seed-deal-scaler-system-design",
		name: "Scaler System Design Bootcamp Sponsorship",
		companyDomain: "scaler.com",
		amountInr: 500000,
		stage: DealStage.QUALIFIED_TO_BUY, // Media Kit Sent
		description: "60s Mid-roll integration + Telegram broadcast",
		expectedDays: 21,
		closed: false,
	},
	{
		id: "seed-deal-notion-template-drop",
		name: "Notion Creator Template Drop",
		companyDomain: "notion.so",
		amountInr: 210000,
		stage: DealStage.DEMO_BOOKED, // Inbound Inquiry
		description: "IG Carousel + Reel Keyword 'TEMPLATE' auto-DM",
		expectedDays: 30,
		closed: false,
	},
	{
		id: "seed-deal-mamaearth-haircare",
		name: "Mamaearth Organic Hair Care Campaign",
		companyDomain: "mamaearth.in",
		amountInr: 280000,
		stage: DealStage.DEMO_BOOKED, // Inbound Inquiry
		description: "2x Instagram Reels with bio link tracking & coupon code",
		expectedDays: 25,
		closed: false,
	},
];

type Transliterations = Record<string, string>;

const TRANSLITERATIONS: Transliterations = {
	ø: "o",
	æ: "ae",
	œ: "oe",
	å: "a",
	ß: "ss",
	đ: "d",
	ł: "l",
	þ: "th",
};

function slug(value: string): string {
	return value
		.toLowerCase()
		.replace(/[øæœåßđłþ]/g, (char) => TRANSLITERATIONS[char] ?? char)
		.normalize("NFD")
		.replace(/\p{Mn}/gu, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

async function seedOwners(): Promise<string[]> {
	const existing = await db.user.findMany({
		select: { id: true, email: true },
	});

	if (existing.length > 0) {
		console.log(`Using ${existing.length} existing user(s) as owners.`);
		return existing.map((user) => user.id);
	}

	console.log("No users yet — creating creator workspace owners.");
	const created = await Promise.all(
		OWNERS.map((owner) =>
			db.user.upsert({
				where: { email: owner.email },
				create: {
					id: `seed-${slug(owner.name)}`,
					name: owner.name,
					email: owner.email,
					emailVerified: true,
					updatedAt: new Date(),
				},
				update: {},
				select: { id: true },
			}),
		),
	);

	return created.map((user) => user.id);
}

async function seedIcons(
	companies: { id: string; domain: string | null; iconUrl: string | null }[],
): Promise<void> {
	const missing = companies.filter(
		(company) => company.iconUrl === null && company.domain,
	);
	if (missing.length === 0) return;

	let resolved = 0;
	for (const company of missing) {
		const source = await resolveFavicon(company.domain);
		if (!source) continue;

		const iconUrl =
			(await mirror(source, `companies/${company.id}/icon`)) ?? source;

		await db.company.updateMany({
			where: { id: company.id, iconUrl: null },
			data: { iconUrl },
		});
		resolved += 1;
	}

	console.log(`Resolved ${resolved} of ${missing.length} brand icons.`);
}

async function seedCompanies(
	ownerIds: string[],
): Promise<{ id: string; name: string; domain: string }[]> {
	const companies = [];

	for (const brand of BRANDS) {
		const row = await db.company.upsert({
			where: { domain: brand.domain },
			create: {
				name: brand.name,
				domain: brand.domain,
				website: `https://${brand.domain}`,
				industry: brand.industry,
				city: brand.city,
				country: brand.country,
				countryCode: brand.countryCode,
				ownerId: pick(ownerIds),
				createdAt: daysFromNow(-integer(40, 200), 12),
			},
			update: {
				name: brand.name,
				industry: brand.industry,
				city: brand.city,
				country: brand.country,
				countryCode: brand.countryCode,
			},
			select: { id: true, name: true, domain: true, iconUrl: true },
		});
		companies.push({ ...row, domain: row.domain ?? brand.domain });
	}

	await seedIcons(companies);
	return companies.map(({ iconUrl: _, ...company }) => company);
}

type SeededField = {
	id: string;
	key: string;
	options: { id: string; label: string }[];
};

async function upsertField(
	entity: FieldEntity,
	label: string,
	type: FieldType,
	position: number,
	options: readonly string[] = [],
): Promise<SeededField> {
	const key = fieldKeyFromLabel(label);
	const definition = await db.fieldDefinition.upsert({
		where: { entity_key: { entity, key } },
		create: {
			entity,
			key,
			label,
			type,
			showOnTable: false,
			showOnFilter: false,
			agentFilled: type !== "USER" && type !== "NUMBER",
			position,
			options: {
				create: options.map((optionLabel, index) => ({
					label: optionLabel,
					position: index,
				})),
			},
		},
		update: { label, type, position },
		include: { options: true },
	});

	return {
		id: definition.id,
		key: definition.key,
		options: definition.options,
	};
}

function optionIdFor(field: SeededField, label: string): string {
	const option = field.options.find((entry) => entry.label === label);
	if (!option) {
		// Fallback to first option if exact label not matched
		return field.options[0]?.id ?? "";
	}
	return option.id;
}

type CreatorFields = {
	sponsorCategory: SeededField;
	targetPlatforms: SeededField;
	avgCampaignBudget: SeededField;
	accountType: SeededField;
	instagramHandle: SeededField;
	followerTier: SeededField;
	engagementRate: SeededField;
	deliverablesScope: SeededField;
	exclusivityWindow: SeededField;
	affiliateUtmCode: SeededField;
	usageRights: SeededField;
};

async function seedCustomFields(): Promise<CreatorFields> {
	// Company fields
	const sponsorCategory = await upsertField(
		"COMPANY",
		"Sponsor Category",
		FieldType.SELECT,
		0,
		["D2C", "EdTech", "Gaming", "FinTech", "SaaS"],
	);
	const targetPlatforms = await upsertField(
		"COMPANY",
		"Target Platforms",
		FieldType.SELECT,
		1,
		["YouTube", "Instagram Reels", "YouTube Shorts"],
	);
	const avgCampaignBudget = await upsertField(
		"COMPANY",
		"Avg Campaign Budget",
		FieldType.NUMBER,
		2,
	);
	const accountType = await upsertField(
		"COMPANY",
		"Account type",
		FieldType.SELECT,
		3,
		["Prospect", "Customer", "Partner", "Churned"],
	);

	// Contact fields
	const instagramHandle = await upsertField(
		"CONTACT",
		"Instagram Handle",
		FieldType.TEXT,
		0,
	);
	const followerTier = await upsertField(
		"CONTACT",
		"Subscriber / Follower Tier",
		FieldType.SELECT,
		1,
		["Brand Manager", "Macro Creator", "Superfan"],
	);
	const engagementRate = await upsertField(
		"CONTACT",
		"Engagement Rate (%)",
		FieldType.NUMBER,
		2,
	);

	// Deal fields
	const deliverablesScope = await upsertField(
		"DEAL",
		"Deliverables Scope",
		FieldType.TEXT,
		0,
	);
	const exclusivityWindow = await upsertField(
		"DEAL",
		"Exclusivity Window",
		FieldType.SELECT,
		1,
		["None", "30 Days", "60 Days", "90 Days", "Category Exclusive"],
	);
	const affiliateUtmCode = await upsertField(
		"DEAL",
		"Affiliate / UTM Code",
		FieldType.TEXT,
		2,
	);
	const usageRights = await upsertField(
		"DEAL",
		"Usage Rights",
		FieldType.SELECT,
		3,
		[
			"Organic Only",
			"30-Day Paid Whitelist",
			"90-Day Digital Ads",
			"Perpetual Commercial",
		],
	);

	return {
		sponsorCategory,
		targetPlatforms,
		avgCampaignBudget,
		accountType,
		instagramHandle,
		followerTier,
		engagementRate,
		deliverablesScope,
		exclusivityWindow,
		affiliateUtmCode,
		usageRights,
	};
}

type SeededContact = {
	id: string;
	companyId: string | null;
	email: string | null;
	instagram?: string;
};

async function seedContacts(
	companies: { id: string; domain: string }[],
	ownerIds: string[],
): Promise<SeededContact[]> {
	const companyByDomain = new Map(companies.map((c) => [c.domain, c.id]));
	const contacts: SeededContact[] = [];

	for (const spec of SPECIFIC_CONTACTS) {
		const companyId = spec.companyDomain
			? (companyByDomain.get(spec.companyDomain) ?? null)
			: null;

		const contact = await db.contact.upsert({
			where: { email: spec.email },
			create: {
				firstName: spec.firstName,
				lastName: spec.lastName,
				email: spec.email,
				title: spec.title,
				phone: spec.phone,
				companyId,
				ownerId: pick(ownerIds),
				createdAt: daysFromNow(-integer(15, 120), 8),
			},
			update: {
				firstName: spec.firstName,
				lastName: spec.lastName,
				title: spec.title,
				phone: spec.phone,
				companyId,
			},
			select: { id: true, companyId: true, email: true },
		});

		contacts.push({ ...contact, instagram: spec.instagram });

		if (companyId) {
			await db.company.update({
				where: { id: companyId },
				data: { primaryContactId: contact.id },
			});
		}
	}

	return contacts;
}

const SEED_RATES = {
	INR: 86.5,
	USD: 1.0,
	EUR: 1.09,
	GBP: 1.27,
	CAD: 0.73,
	AUD: 0.66,
	JPY: 0.0067,
} satisfies Record<string, number>;

async function seedRates(): Promise<number> {
	const asOf = daysFromNow(-1);

	// Ensure Workspace reporting currency is INR for Indian Creator CRM
	await db.appSetting.upsert({
		where: { id: SETTINGS_ID },
		create: {
			id: SETTINGS_ID,
			reportingCurrency: "INR",
		},
		update: {
			reportingCurrency: "INR",
		},
		select: { id: true },
	});

	for (const [quoteCurrency, rate] of Object.entries(SEED_RATES)) {
		await db.exchangeRate.upsert({
			where: {
				baseCurrency_quoteCurrency_source: {
					baseCurrency: "USD",
					quoteCurrency,
					source: RateSource.FETCHED,
				},
			},
			create: {
				baseCurrency: "USD",
				quoteCurrency,
				rate,
				asOf,
				source: RateSource.FETCHED,
				provider: "seed",
			},
			update: { rate, asOf, provider: "seed" },
		});
	}

	return Object.keys(SEED_RATES).length;
}

type SeededDeal = {
	id: string;
	companyId: string;
	ownerId: string;
	closed: boolean;
};

async function seedDeals(
	companies: { id: string; domain: string }[],
	contacts: SeededContact[],
	ownerIds: string[],
): Promise<SeededDeal[]> {
	const companyByDomain = new Map(companies.map((c) => [c.domain, c.id]));
	const deals: SeededDeal[] = [];

	for (const spec of SPECIFIC_DEALS) {
		const companyId = companyByDomain.get(spec.companyDomain);
		if (!companyId) continue;

		const ownerId = pick(ownerIds);
		const createdAt = daysFromNow(-integer(15, 60), 6);
		const stageChangedAt = daysFromNow(spec.closed ? -2 : -integer(1, 10), 4);

		await db.deal.upsert({
			where: { id: spec.id },
			create: {
				id: spec.id,
				name: spec.name,
				description: spec.description,
				companyId,
				ownerId,
				stage: spec.stage,
				stageChangedAt,
				amount: spec.amountInr,
				currency: "INR",
				baseAmount: spec.amountInr,
				baseCurrency: "INR",
				fxRate: 1,
				fxRateAt: daysFromNow(-1),
				expectedCloseDate: daysFromNow(spec.expectedDays),
				closedAt: spec.closed ? stageChangedAt : null,
				createdAt,
			},
			update: {
				name: spec.name,
				description: spec.description,
				stage: spec.stage,
				amount: spec.amountInr,
				currency: "INR",
				baseAmount: spec.amountInr,
				baseCurrency: "INR",
			},
		});

		const primaryContact = contacts.find((c) => c.companyId === companyId);
		if (primaryContact) {
			await db.dealContact.upsert({
				where: {
					dealId_contactId: { dealId: spec.id, contactId: primaryContact.id },
				},
				create: {
					dealId: spec.id,
					contactId: primaryContact.id,
					role: "Brand Partnership Manager",
				},
				update: {},
			});
		}

		deals.push({ id: spec.id, companyId, ownerId, closed: spec.closed });
	}

	return deals;
}

async function seedFieldValues(
	fields: CreatorFields,
	companies: { id: string; domain: string }[],
	contacts: SeededContact[],
	deals: SeededDeal[],
): Promise<void> {
	// Brand company field values
	const categoryMap = {
		"boat-lifestyle.com": "D2C",
		"zerodha.com": "FinTech",
		"asus.com": "Gaming",
		"mamaearth.in": "D2C",
		"scaler.com": "EdTech",
		"notion.so": "SaaS",
	} satisfies Record<string, string>;

	for (const company of companies) {
		const category =
			company.domain in categoryMap
				? categoryMap[company.domain as keyof typeof categoryMap]
				: "D2C";
		const optId = optionIdFor(fields.sponsorCategory, category);
		if (optId) {
			await db.fieldValue.upsert({
				where: {
					fieldId_companyId: {
						fieldId: fields.sponsorCategory.id,
						companyId: company.id,
					},
				},
				create: {
					fieldId: fields.sponsorCategory.id,
					companyId: company.id,
					optionId: optId,
				},
				update: {},
			});
		}

		const platformOptId = optionIdFor(
			fields.targetPlatforms,
			category === "Gaming" ? "YouTube" : "Instagram Reels",
		);
		if (platformOptId) {
			await db.fieldValue.upsert({
				where: {
					fieldId_companyId: {
						fieldId: fields.targetPlatforms.id,
						companyId: company.id,
					},
				},
				create: {
					fieldId: fields.targetPlatforms.id,
					companyId: company.id,
					optionId: platformOptId,
				},
				update: {},
			});
		}

		await db.fieldValue.upsert({
			where: {
				fieldId_companyId: {
					fieldId: fields.avgCampaignBudget.id,
					companyId: company.id,
				},
			},
			create: {
				fieldId: fields.avgCampaignBudget.id,
				companyId: company.id,
				number: integer(250000, 750000),
			},
			update: {},
		});
	}

	// Contact custom field values
	for (const contact of contacts) {
		if (contact.instagram) {
			await db.fieldValue.upsert({
				where: {
					fieldId_contactId: {
						fieldId: fields.instagramHandle.id,
						contactId: contact.id,
					},
				},
				create: {
					fieldId: fields.instagramHandle.id,
					contactId: contact.id,
					text: `@${contact.instagram}`,
				},
				update: {},
			});
		}

		const tier = contact.companyId ? "Brand Manager" : "Macro Creator";
		const tierOptId = optionIdFor(fields.followerTier, tier);
		if (tierOptId) {
			await db.fieldValue.upsert({
				where: {
					fieldId_contactId: {
						fieldId: fields.followerTier.id,
						contactId: contact.id,
					},
				},
				create: {
					fieldId: fields.followerTier.id,
					contactId: contact.id,
					optionId: tierOptId,
				},
				update: {},
			});
		}

		await db.fieldValue.upsert({
			where: {
				fieldId_contactId: {
					fieldId: fields.engagementRate.id,
					contactId: contact.id,
				},
			},
			create: {
				fieldId: fields.engagementRate.id,
				contactId: contact.id,
				number: Number((random() * 4 + 3.5).toFixed(1)), // 3.5% - 7.5%
			},
			update: {},
		});
	}

	// Deal custom field values
	for (const deal of deals) {
		await db.fieldValue.upsert({
			where: {
				fieldId_dealId: {
					fieldId: fields.affiliateUtmCode.id,
					dealId: deal.id,
				},
			},
			create: {
				fieldId: fields.affiliateUtmCode.id,
				dealId: deal.id,
				text: `utm_source=youtube&utm_campaign=${slug(deal.id)}&ref=garvit`,
			},
			update: {},
		});

		const rightsOpt = optionIdFor(fields.usageRights, "30-Day Paid Whitelist");
		if (rightsOpt) {
			await db.fieldValue.upsert({
				where: {
					fieldId_dealId: {
						fieldId: fields.usageRights.id,
						dealId: deal.id,
					},
				},
				create: {
					fieldId: fields.usageRights.id,
					dealId: deal.id,
					optionId: rightsOpt,
				},
				update: {},
			});
		}
	}
}

async function seedTimelineActivities(
	companies: { id: string; domain: string }[],
	_contacts: SeededContact[],
	deals: SeededDeal[],
	ownerId: string,
): Promise<number> {
	const existing = await db.activity.count();
	if (existing > 0) {
		console.log(
			`Activities already present (${existing}) — adding creator logs.`,
		);
	}

	const companyByDomain = new Map(companies.map((c) => [c.domain, c.id]));
	const dealMap = new Map(deals.map((d) => [d.id, d]));

	const boatId = companyByDomain.get("boat-lifestyle.com");
	const asusId = companyByDomain.get("asus.com");
	const zerodhaId = companyByDomain.get("zerodha.com");
	const notionId = companyByDomain.get("notion.so");
	const scalerId = companyByDomain.get("scaler.com");

	const boatDeal = dealMap.get("seed-deal-boat-nirvana-q4");
	const asusDeal = dealMap.get("seed-deal-asus-rog-zephyrus");
	const zerodhaDeal = dealMap.get("seed-deal-zerodha-student-series");
	const notionDeal = dealMap.get("seed-deal-notion-template-drop");
	const scalerDeal = dealMap.get("seed-deal-scaler-system-design");

	const activities = [
		// 1. Inbound Gmail Threads
		{
			type: ActivityType.EMAIL,
			subject:
				"[Inbound Gmail] boAt Nirvana ANC Launch Collaboration Scope & Deliverables",
			body: "Hi Garvit, loved your previous audio comparison video! We are launching the Nirvana ANC line in Q4 and want to lock in a dedicated YouTube integration + 2 Reels. Attached our brief and budget target.",
			occurredAt: daysFromNow(-12, 2),
			companyId: boatId ?? null,
			dealId: boatDeal?.id ?? null,
			createdById: ownerId,
			createdAt: daysFromNow(-12, 2),
		},
		{
			type: ActivityType.EMAIL,
			subject:
				"[Inbound Gmail] Scaler Academy Tech Bootcamp sponsorship request",
			body: "Hey Garvit, Scaler is hosting a Free System Design Masterclass next month. We'd love a 60s mid-roll integration in your upcoming full-stack architecture video.",
			occurredAt: daysFromNow(-18, 3),
			companyId: scalerId ?? null,
			dealId: scalerDeal?.id ?? null,
			createdById: ownerId,
			createdAt: daysFromNow(-18, 3),
		},
		{
			type: ActivityType.EMAIL,
			subject: "[Inbound Gmail] Notion Template Drop partnership proposal",
			body: "Hi team, Notion wants to collaborate with Garvit on a Creator CRM template showcase. We are offering ₹2,10,000 for a carousel + dedicated Reel with automated keyword DM delivery.",
			occurredAt: daysFromNow(-5, 1),
			companyId: notionId ?? null,
			dealId: notionDeal?.id ?? null,
			createdById: ownerId,
			createdAt: daysFromNow(-5, 1),
		},

		// 2. Automated Instagram Comment-to-DM dispatches
		{
			type: ActivityType.NOTE,
			subject:
				"[SLAVE-2: IG COMMENT-TO-DM] Dispatched affiliate link via /v19.0/17982349823/messages",
			body: "Keyword 'TEMPLATE' detected on Instagram Reel #17982349823. Automatically sent trackable Notion template download link and setup guide to user @dev_prateek.",
			occurredAt: daysFromNow(-2, 4),
			companyId: notionId ?? null,
			dealId: notionDeal?.id ?? null,
			createdById: ownerId,
			createdAt: daysFromNow(-2, 4),
		},
		{
			type: ActivityType.NOTE,
			subject:
				"[SLAVE-2: IG COMMENT-TO-DM] Sent boAt ANC discount coupon to 48 comment leads",
			body: "Dispatched exclusive ₹500 off voucher code 'GARVITANC' to 48 verified Instagram users who commented 'ANC' on the latest audio teardown reel.",
			occurredAt: daysFromNow(-4, 5),
			companyId: boatId ?? null,
			dealId: boatDeal?.id ?? null,
			createdById: ownerId,
			createdAt: daysFromNow(-4, 5),
		},

		// 3. Slave 1 Brand Research briefs
		{
			type: ActivityType.NOTE,
			subject:
				"[SLAVE-1: BRAND RESEARCH] ASUS ROG Zephyrus G16 developer benchmark brief compiled",
			body: "Brand brief ready: ASUS ROG Zephyrus G16 featuring Intel Core Ultra 9 & RTX 4080. Recommended deliverables: 1080p thermal tests running Docker + Local LLM + Blender render, followed by Cyberpunk 2077 benchmark.",
			occurredAt: daysFromNow(-7, 2),
			companyId: asusId ?? null,
			dealId: asusDeal?.id ?? null,
			createdById: ownerId,
			createdAt: daysFromNow(-7, 2),
		},
		{
			type: ActivityType.NOTE,
			subject:
				"[SLAVE-1: BRAND RESEARCH] Zerodha Varsity financial literacy series audience alignment verified",
			body: "Audience analytics: 72% of audience is aged 20-32 in Tier-1/Tier-2 Indian cities. High affinity for SIPs and algorithmic trading. Zerodha Varsity 3x Shorts campaign approved for maximum engagement.",
			occurredAt: daysFromNow(-10, 4),
			companyId: zerodhaId ?? null,
			dealId: zerodhaDeal?.id ?? null,
			createdById: ownerId,
			createdAt: daysFromNow(-10, 4),
		},

		// 4. Tasks & Deliverables
		{
			type: ActivityType.TASK,
			subject: "Script review with ASUS ROG technical team",
			body: "Finalize benchmark test suite and B-roll shotlist before filming.",
			occurredAt: null,
			dueAt: daysFromNow(-2), // Overdue deliverable
			completedAt: null,
			companyId: asusId ?? null,
			dealId: asusDeal?.id ?? null,
			createdById: ownerId,
			createdAt: daysFromNow(-6),
		},
		{
			type: ActivityType.TASK,
			subject: "Send draft cut to boAt brand marketing",
			body: "Upload unlisted YouTube preview for sound sync approval.",
			occurredAt: null,
			dueAt: daysFromNow(3),
			completedAt: null,
			companyId: boatId ?? null,
			dealId: boatDeal?.id ?? null,
			createdById: ownerId,
			createdAt: daysFromNow(-2),
		},
		{
			type: ActivityType.TASK,
			subject: "Share campaign performance & UTM report with Zerodha",
			body: "Export link-in-bio clicks and conversion report from tracking dashboard.",
			occurredAt: null,
			dueAt: daysFromNow(-1),
			completedAt: daysFromNow(-1),
			companyId: zerodhaId ?? null,
			dealId: zerodhaDeal?.id ?? null,
			createdById: ownerId,
			createdAt: daysFromNow(-14),
		},
	];

	for (const act of activities) {
		await db.activity.create({
			data: {
				type: act.type,
				subject: act.subject,
				body: act.body,
				occurredAt: act.occurredAt,
				dueAt: act.dueAt,
				completedAt: act.completedAt,
				companyId: act.companyId,
				dealId: act.dealId,
				createdById: act.createdById,
				createdAt: act.createdAt,
			},
		});
	}

	return activities.length;
}

async function seedPreConfiguredAgents(ownerId: string): Promise<void> {
	// 1. Slave 1: Brand Sponsorship & Collab Triage Agent
	const _agent1 = await db.agentDefinition.upsert({
		where: { id: "agent-slave-1" },
		create: {
			id: "agent-slave-1",
			name: "Slave 1: Brand Sponsorship Triage",
			description:
				"Autonomously researches inbound sponsor brands, evaluates deliverable budgets in INR against creator rate cards, updates Collab Deal stages, and requests Host approval for high-value deals.",
			status: "LIVE",
			createdById: ownerId,
		},
		update: {
			name: "Slave 1: Brand Sponsorship Triage",
			description:
				"Autonomously researches inbound sponsor brands, evaluates deliverable budgets in INR against creator rate cards, updates Collab Deal stages, and requests Host approval for high-value deals.",
			status: "LIVE",
		},
	});

	const version1 = await db.agentVersion.upsert({
		where: { agentId_number: { agentId: "agent-slave-1", number: 1 } },
		create: {
			id: "agent-slave-1-v1",
			agentId: "agent-slave-1",
			number: 1,
			status: "DEPLOYED",
			instructions: `# Slave 1: Brand Sponsorship & Collab Triage Agent

You are the autonomous Brand Sponsorship & Collab Triage Agent for the creator ecosystem.
Your mission is to evaluate inbound sponsor brands, verify deliverable budgets in INR against standard creator rate cards, update Collab Deal stages, and escalate high-value opportunities to the Host creator.

## Operational Workflow

1. **Trigger Handling & Data Retrieval**:
   - When a deal is created or moves stage (\`deal.created\`, \`deal.stage.changed\`), inspect the collab record via \`read_crm_record\`.
   - Cross-reference the associated brand (\`company\`) domain, website, target platforms, and previous sponsorship history via \`query_crm\`.

2. **Rate Card Evaluation**:
   - Compare proposed budget against minimum creator rate cards:
     - Dedicated YouTube Integration: ₹4,00,000 - ₹8,00,000
     - Instagram Reels (60s): ₹1,50,000 - ₹3,00,000
     - Multi-Platform Bundle (YT Dedicated + 2x Reels): ₹6,00,000+
     - Story/Telegram Blast: ₹50,000 - ₹1,00,000
   - Identify scope deliverables: Dedicated vs Integrated, Exclusivity window (e.g., 30-day competitive blackout), and Usage rights (organic vs paid ads/whitelisting).

3. **Stage Automation & Decisioning**:
   - For deals with clear scope and budget >= ₹2,00,000:
     - Transition deal stage to \`DECISION_MAKER_BOUGHT_IN\` ("Rate Negotiation").
     - Log a structured triage assessment note on the deal via \`create_crm_activity\`.
     - Request Host approval using \`ask_question\` with details on deliverables, timeline, exclusivity, and proposed payout.
   - For inquiries lacking budget or deliverables scope:
     - Advance to \`QUALIFIED_TO_BUY\` ("Media Kit Sent") and dispatch media kit + rate card automatically.

4. **Safety & Guardrails**:
   - Never agree to perpetual or unlimited usage rights without explicit Host confirmation.
   - Ensure all payments are structured in INR (₹) with milestone disbursements (50% on signing, 50% on published link).`,
			manifest: {
				description:
					"Autonomously researches inbound sponsor brands, evaluates deliverable budgets in INR against creator rate cards, updates Collab Deal stages, and requests Host approval for high-value deals.",
				actions: [
					{
						type: "crm.activity.create",
						provider: "crm",
						summary:
							"Log triage assessment notes and deliverables evaluation on collab deals",
						activityTypes: ["NOTE", "TASK"],
					},
					{
						type: "run.summary",
						provider: "crm",
						summary:
							"Publish run summary to workspace timeline and creator dashboard",
					},
				],
				triggers: [
					{
						type: "EVENT",
						name: "Collab Deal Created",
						summary:
							"Triggered when a brand sponsorship collab deal is created in the pipeline",
						config: {
							event: "deal.created",
						},
					},
				],
				dataScope: {
					mode: "WORKSPACE",
					summary:
						"Access to brand sponsors, collab deals, and creator rate card records",
					resources: [],
				},
			},
			modelId: "gemini-2.5-pro",
			modelContextWindowTokens: 1000000,
			sandboxPolicy: {},
			createdById: ownerId,
			approvedAt: daysFromNow(-19),
			deployedAt: daysFromNow(-19),
		},
		update: {},
	});

	await db.agentDefinition.update({
		where: { id: "agent-slave-1" },
		data: { currentVersionId: version1.id },
	});

	const trigger1 = await db.agentTrigger.upsert({
		where: { id: "trigger-slave-1-deal-created" },
		create: {
			id: "trigger-slave-1-deal-created",
			agentId: "agent-slave-1",
			versionId: version1.id,
			type: AgentTriggerType.EVENT,
			name: "Collab Deal Created",
			config: { event: "deal.created" },
			enabled: true,
			createdById: ownerId,
		},
		update: {
			versionId: version1.id,
			type: AgentTriggerType.EVENT,
			name: "Collab Deal Created",
			config: { event: "deal.created" },
			enabled: true,
		},
	});

	// 2. Slave 2: Omnichannel Community & Comment-to-DM Agent
	const _agent2 = await db.agentDefinition.upsert({
		where: { id: "agent-slave-2" },
		create: {
			id: "agent-slave-2",
			name: "Slave 2: IG & WhatsApp Community DM",
			description:
				"Monitors Instagram Reel comments, WhatsApp DMs, and Telegram messages using REIC intent classification. Dispatches automated affiliate/resource links via Meta's 24h CSW comment_id rule.",
			status: "LIVE",
			createdById: ownerId,
		},
		update: {
			name: "Slave 2: IG & WhatsApp Community DM",
			description:
				"Monitors Instagram Reel comments, WhatsApp DMs, and Telegram messages using REIC intent classification. Dispatches automated affiliate/resource links via Meta's 24h CSW comment_id rule.",
			status: "LIVE",
		},
	});

	const version2 = await db.agentVersion.upsert({
		where: { agentId_number: { agentId: "agent-slave-2", number: 1 } },
		create: {
			id: "agent-slave-2-v1",
			agentId: "agent-slave-2",
			number: 1,
			status: "DEPLOYED",
			instructions: `# Slave 2: IG & WhatsApp Community DM Agent (REIC)

You are the Omnichannel Community & Comment-to-DM Agent specializing in audience engagement, keyword auto-fulfillment, and creator affiliate link delivery.
You operate across Instagram Reels comments, WhatsApp Community DMs, and Telegram broadcast replies.

## REIC Framework (Recognize, Evaluate, Intent, Convert)

1. **Recognize**:
   - Detect inbound interactions from Instagram comment webhooks, WhatsApp incoming chats, or contact creation.
   - Extract keywords such as \`TEMPLATE\`, \`CODE\`, \`LINK\`, \`RATE\`, \`GEAR\`, \`DISCOUNT\`, or \`COURSE\`.

2. **Evaluate & Policy Compliance**:
   - **Meta 24h Customer Service Window (CSW) & \`comment_id\` rule**:
     - Responses to Instagram reel comments MUST be dispatched using Meta Graph API \`/v19.0/{comment_id}/messages\` within 24 hours of the comment timestamp.
     - Never spam or cold DM users who did not trigger a keyword.
     - Single direct message per trigger with instant delivery confirmation.

3. **Intent Classification**:
   - Categorize intent:
     - \`RESOURCE_DOWNLOAD\`: User requested template, cheatsheet, or code snippet.
     - \`AFFILIATE_PURCHASE\`: User asked for gear link, hardware discount code (e.g., boAt ANC, ASUS ROG).
     - \`COLLAB_INQUIRY\`: Brand representative or fellow creator asking to connect.
     - \`FAN_APPRECIATION\`: Casual encouragement or feedback.

4. **Execution & Fulfillment**:
   - Call \`create_crm_activity\` to record the omnichannel interaction under the contact timeline.
   - Format outbound DM response with verified, trackable UTM campaign parameters:
     - Example: \`https://creatorshop.in/templates/system-design?utm_source=instagram&utm_medium=reels_dm&utm_campaign=auto_reply\`
   - If \`COLLAB_INQUIRY\` is detected, notify Host and trigger Slave 1 Collab Triage flow.`,
			manifest: {
				description:
					"Monitors social comments and messages, classifies user intent via REIC, and dispatches compliant automated DMs with affiliate links.",
				actions: [
					{
						type: "crm.activity.create",
						provider: "crm",
						summary:
							"Record omnichannel DM interactions and link clicks on contact profiles",
						activityTypes: ["NOTE", "TASK"],
					},
					{
						type: "run.summary",
						provider: "crm",
						summary: "Log social fulfillment metrics and conversion summaries",
					},
				],
				triggers: [
					{
						type: "EVENT",
						name: "Community Contact Created",
						summary:
							"Triggered when a new social contact or subscriber profile is created",
						config: {
							event: "contact.created",
						},
					},
				],
				dataScope: {
					mode: "WORKSPACE",
					summary:
						"Access to community contacts, social handles, and affiliate link catalogs",
					resources: [],
				},
			},
			modelId: "gemini-2.5-flash",
			modelContextWindowTokens: 1000000,
			sandboxPolicy: {},
			createdById: ownerId,
			approvedAt: daysFromNow(-19),
			deployedAt: daysFromNow(-19),
		},
		update: {},
	});

	await db.agentDefinition.update({
		where: { id: "agent-slave-2" },
		data: { currentVersionId: version2.id },
	});

	const trigger2 = await db.agentTrigger.upsert({
		where: { id: "trigger-slave-2-contact-created" },
		create: {
			id: "trigger-slave-2-contact-created",
			agentId: "agent-slave-2",
			versionId: version2.id,
			type: AgentTriggerType.EVENT,
			name: "Community Contact Created",
			config: { event: "contact.created" },
			enabled: true,
			createdById: ownerId,
		},
		update: {
			versionId: version2.id,
			type: AgentTriggerType.EVENT,
			name: "Community Contact Created",
			config: { event: "contact.created" },
			enabled: true,
		},
	});

	// Seed 2 Completed Agent Runs for Rich History
	// Run 1: Slave 1 on boAt Nirvana ANC Collab Deal
	const boatDealId = "seed-deal-boat-nirvana-q4";
	const run1Time = daysFromNow(-5);
	await db.agentRun.upsert({
		where: { id: "seed-run-slave-1-boat" },
		create: {
			id: "seed-run-slave-1-boat",
			agentId: "agent-slave-1",
			versionId: version1.id,
			triggerId: trigger1.id,
			initiatedById: ownerId,
			triggerType: AgentTriggerType.EVENT,
			status: AgentRunStatus.SUCCEEDED,
			sessionId: "session-slave-1-boat",
			idempotencyKey: "idemp-run-slave-1-boat",
			correlationId: "corr-run-slave-1-boat",
			summary:
				"Evaluated boAt Nirvana ANC Q4 Launch Collab (₹4,50,000). Verified deliverables scope (1x YT Dedicated + 2x IG Reels), validated INR budget against rate card, transitioned stage to Rate Negotiation, and queued Host approval request.",
			modelId: "gemini-2.5-pro",
			inputTokens: 1420,
			outputTokens: 385,
			costUsd: 0.00285,
			nextEventSequence: 5,
			createdAt: run1Time,
			startedAt: run1Time,
			finishedAt: new Date(run1Time.getTime() + 4200),
		},
		update: {
			versionId: version1.id,
			triggerId: trigger1.id,
			status: AgentRunStatus.SUCCEEDED,
			summary:
				"Evaluated boAt Nirvana ANC Q4 Launch Collab (₹4,50,000). Verified deliverables scope (1x YT Dedicated + 2x IG Reels), validated INR budget against rate card, transitioned stage to Rate Negotiation, and queued Host approval request.",
			finishedAt: new Date(run1Time.getTime() + 4200),
		},
	});

	await db.agentRunEvent.deleteMany({
		where: { runId: "seed-run-slave-1-boat" },
	});
	await db.agentRunEvent.createMany({
		data: [
			{
				id: "seed-event-s1-0",
				runId: "seed-run-slave-1-boat",
				sequence: 0,
				type: "trigger.received",
				data: {
					summary:
						"Received deal.created event for boAt Nirvana ANC Q4 Launch Collab (₹4,50,000)",
					dealId: boatDealId,
				},
				emittedAt: run1Time,
			},
			{
				id: "seed-event-s1-1",
				runId: "seed-run-slave-1-boat",
				sequence: 1,
				type: "tool.call",
				data: {
					summary:
						"Inspected brand profile boAt Lifestyle (boat-lifestyle.com) and contact Riya Sharma via read_crm_record",
					tool: "read_crm_record",
				},
				emittedAt: new Date(run1Time.getTime() + 1100),
			},
			{
				id: "seed-event-s1-2",
				runId: "seed-run-slave-1-boat",
				sequence: 2,
				type: "triage.evaluation",
				data: {
					summary:
						"Budget ₹4,50,000 matches creator rate card threshold for 1x YT Dedicated + 2x IG Reels with 30-day audio exclusivity",
					evaluation: "APPROVED_FOR_NEGOTIATION",
				},
				emittedAt: new Date(run1Time.getTime() + 2400),
			},
			{
				id: "seed-event-s1-3",
				runId: "seed-run-slave-1-boat",
				sequence: 3,
				type: "stage.updated",
				data: {
					summary:
						"Updated deal stage to Rate Negotiation (DECISION_MAKER_BOUGHT_IN)",
					stage: "DECISION_MAKER_BOUGHT_IN",
				},
				emittedAt: new Date(run1Time.getTime() + 3100),
			},
			{
				id: "seed-event-s1-4",
				runId: "seed-run-slave-1-boat",
				sequence: 4,
				type: "action.completed",
				data: {
					summary:
						"Created sponsorship evaluation note and requested Host approval for deal >= ₹2,00,000",
					dealId: boatDealId,
				},
				emittedAt: new Date(run1Time.getTime() + 4200),
			},
		],
	});

	await db.agentAction.upsert({
		where: { id: "seed-action-slave-1-boat" },
		create: {
			id: "seed-action-slave-1-boat",
			agentId: "agent-slave-1",
			runId: "seed-run-slave-1-boat",
			type: "crm.activity.create",
			provider: "crm",
			targetType: "deal",
			targetId: boatDealId,
			targetLabel: "boAt Nirvana ANC Q4 Launch Collab",
			summary:
				"Logged rate card triage note and queued Host approval for boAt sponsorship (₹4,50,000)",
			status: AgentActionStatus.SUCCEEDED,
			idempotencyKey: "idemp-act-slave-1-boat",
			plannedAt: new Date(run1Time.getTime() + 3200),
			startedAt: new Date(run1Time.getTime() + 3300),
			completedAt: new Date(run1Time.getTime() + 4100),
		},
		update: {
			status: AgentActionStatus.SUCCEEDED,
			summary:
				"Logged rate card triage note and queued Host approval for boAt sponsorship (₹4,50,000)",
			completedAt: new Date(run1Time.getTime() + 4100),
		},
	});

	// Run 2: Slave 2 on Instagram Reel Comment
	const run2Time = daysFromNow(-2);
	await db.agentRun.upsert({
		where: { id: "seed-run-slave-2-ig-dm" },
		create: {
			id: "seed-run-slave-2-ig-dm",
			agentId: "agent-slave-2",
			versionId: version2.id,
			triggerId: trigger2.id,
			initiatedById: ownerId,
			triggerType: AgentTriggerType.EVENT,
			status: AgentRunStatus.SUCCEEDED,
			sessionId: "session-slave-2-ig-dm",
			idempotencyKey: "idemp-run-slave-2-ig-dm",
			correlationId: "corr-run-slave-2-ig-dm",
			summary:
				"Processed Instagram Reel comment from @aarav_creator_fan containing keyword 'GEAR'. Classified intent as AFFILIATE_PURCHASE via REIC and dispatched boAt & ASUS creator kit link via Meta Graph API /v19.0/{comment_id}/messages within CSW window.",
			modelId: "gemini-2.5-flash",
			inputTokens: 820,
			outputTokens: 215,
			costUsd: 0.00062,
			nextEventSequence: 4,
			createdAt: run2Time,
			startedAt: run2Time,
			finishedAt: new Date(run2Time.getTime() + 1850),
		},
		update: {
			versionId: version2.id,
			triggerId: trigger2.id,
			status: AgentRunStatus.SUCCEEDED,
			summary:
				"Processed Instagram Reel comment from @aarav_creator_fan containing keyword 'GEAR'. Classified intent as AFFILIATE_PURCHASE via REIC and dispatched boAt & ASUS creator kit link via Meta Graph API /v19.0/{comment_id}/messages within CSW window.",
			finishedAt: new Date(run2Time.getTime() + 1850),
		},
	});

	await db.agentRunEvent.deleteMany({
		where: { runId: "seed-run-slave-2-ig-dm" },
	});
	await db.agentRunEvent.createMany({
		data: [
			{
				id: "seed-event-s2-0",
				runId: "seed-run-slave-2-ig-dm",
				sequence: 0,
				type: "trigger.received",
				data: {
					summary:
						"Detected Instagram Reel comment from Aarav Kapoor (@aarav_creator_fan): 'Bro what headphones are those? Share link!'",
					source: "instagram_reels",
				},
				emittedAt: run2Time,
			},
			{
				id: "seed-event-s2-1",
				runId: "seed-run-slave-2-ig-dm",
				sequence: 1,
				type: "reic.classification",
				data: {
					summary:
						"REIC Classification: Intent = AFFILIATE_PURCHASE | Keyword = 'LINK'/'GEAR' | Confidence = 0.98",
					intent: "AFFILIATE_PURCHASE",
				},
				emittedAt: new Date(run2Time.getTime() + 650),
			},
			{
				id: "seed-event-s2-2",
				runId: "seed-run-slave-2-ig-dm",
				sequence: 2,
				type: "meta.csw.validation",
				data: {
					summary:
						"Verified Meta 24-hour Customer Service Window (comment age: 4m). Formatted compliant direct message with boAt Nirvana ANC affiliate link",
					compliant: true,
				},
				emittedAt: new Date(run2Time.getTime() + 1200),
			},
			{
				id: "seed-event-s2-3",
				runId: "seed-run-slave-2-ig-dm",
				sequence: 3,
				type: "action.completed",
				data: {
					summary:
						"Dispatched automated Instagram DM to @aarav_creator_fan and recorded engagement note in CRM contact timeline",
					status: "DELIVERED",
				},
				emittedAt: new Date(run2Time.getTime() + 1850),
			},
		],
	});

	await db.agentAction.upsert({
		where: { id: "seed-action-slave-2-dm" },
		create: {
			id: "seed-action-slave-2-dm",
			agentId: "agent-slave-2",
			runId: "seed-run-slave-2-ig-dm",
			type: "crm.activity.create",
			provider: "crm",
			targetType: "contact",
			targetId: "aarav.kapoor@gmail.com",
			targetLabel: "Aarav Kapoor (@aarav_creator_fan)",
			summary:
				"Logged Instagram Comment-to-DM auto-reply: boAt Nirvana ANC affiliate link sent",
			status: AgentActionStatus.SUCCEEDED,
			idempotencyKey: "idemp-act-slave-2-dm",
			plannedAt: new Date(run2Time.getTime() + 1300),
			startedAt: new Date(run2Time.getTime() + 1400),
			completedAt: new Date(run2Time.getTime() + 1800),
		},
		update: {
			status: AgentActionStatus.SUCCEEDED,
			summary:
				"Logged Instagram Comment-to-DM auto-reply: boAt Nirvana ANC affiliate link sent",
			completedAt: new Date(run2Time.getTime() + 1800),
		},
	});

	console.log("Seeded 2 pre-configured Creator AI Custom Agents.");
}

async function main() {
	const rates = await seedRates();
	const ownerIds = await seedOwners();
	const primaryOwnerId = ownerIds[0] ?? "seed-garvit-bhojak";

	const companies = await seedCompanies(ownerIds);
	const contacts = await seedContacts(companies, ownerIds);
	const deals = await seedDeals(companies, contacts, ownerIds);
	const customFields = await seedCustomFields();
	await seedFieldValues(customFields, companies, contacts, deals);

	const activityCount = await seedTimelineActivities(
		companies,
		contacts,
		deals,
		primaryOwnerId,
	);
	await seedPreConfiguredAgents(primaryOwnerId);

	// Also seed omnichannel chat conversations for demo readiness
	try {
		await seedOmnichannel();
	} catch (_e) {
		console.log("Omnichannel seed skipped or already up to date.");
	}

	console.log(
		`\n🎉 Creator CRM Seed Complete!\n` +
			`• Brands & Sponsors: ${companies.length}\n` +
			`• Talent & Contacts: ${contacts.length}\n` +
			`• Brand Collabs: ${deals.length} (in ₹ INR)\n` +
			`• Timeline Activities: ${activityCount}\n` +
			`• Exchange Rates: ${rates}\n` +
			`• Reporting Currency: INR (₹)\n` +
			`• Pre-built Custom Agents: 2 (Slave 1 & Slave 2)`,
	);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
