import { mirror } from "../src/blob";
import { db } from "../src/client";
import { resolveFavicon } from "../src/favicon";
import { fieldKeyFromLabel } from "../src/fields-shape";
import {
	ActivityType,
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
			(categoryMap as Record<string, string>)[company.domain] ?? "D2C";
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
			name: "Slave 1: Brand Sponsorship & Collab Triage Agent",
			description:
				"Triages inbound brand inquiries, extracts campaign requirements, and calculates media kit rate cards.",
			status: "LIVE",
			createdById: ownerId,
		},
		update: {
			name: "Slave 1: Brand Sponsorship & Collab Triage Agent",
			description:
				"Triages inbound brand inquiries, extracts campaign requirements, and calculates media kit rate cards.",
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
			instructions:
				"Monitor inbound email and message inquiries from brands, evaluate fit against creator guidelines, and prepare brand research briefs.",
			manifest: { tools: ["search_crm", "draft_reply", "calculate_rates"] },
			modelId: "gemini-2.5-pro",
			sandboxPolicy: {},
			createdById: ownerId,
		},
		update: {},
	});

	await db.agentDefinition.update({
		where: { id: "agent-slave-1" },
		data: { currentVersionId: version1.id },
	});

	// 2. Slave 2: IG & WhatsApp Community DM Agent (REIC)
	const _agent2 = await db.agentDefinition.upsert({
		where: { id: "agent-slave-2" },
		create: {
			id: "agent-slave-2",
			name: "Slave 2: IG & WhatsApp Community DM Agent (REIC)",
			description:
				"Handles Comment-to-DM automation, fan interaction, and affiliate link dispatch across Instagram and WhatsApp.",
			status: "LIVE",
			createdById: ownerId,
		},
		update: {
			name: "Slave 2: IG & WhatsApp Community DM Agent (REIC)",
			description:
				"Handles Comment-to-DM automation, fan interaction, and affiliate link dispatch across Instagram and WhatsApp.",
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
			instructions:
				"Listen for reel comments with keywords (e.g. 'TEMPLATE', 'LINK', 'DEAL'), trigger direct messages with trackable UTM affiliate links via Meta Graph API.",
			manifest: {
				tools: ["send_dm", "log_interaction", "generate_affiliate_link"],
			},
			modelId: "gemini-2.5-flash",
			sandboxPolicy: {},
			createdById: ownerId,
		},
		update: {},
	});

	await db.agentDefinition.update({
		where: { id: "agent-slave-2" },
		data: { currentVersionId: version2.id },
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
