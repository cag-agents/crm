export type FieldTemplate = {
	label: string;
	type:
		| "TEXT"
		| "LONG_TEXT"
		| "NUMBER"
		| "DATE"
		| "CHECKBOX"
		| "SELECT"
		| "URL"
		| "EMAIL"
		| "PHONE"
		| "USER";
	options?: readonly string[];
};

export const FIELD_TEMPLATES = {
	COMPANY: [
		{
			label: "Sponsor Category",
			type: "SELECT",
			options: ["D2C", "EdTech", "Gaming", "FinTech", "SaaS"],
		},
		{
			label: "Target Platforms",
			type: "SELECT",
			options: ["YouTube", "Instagram Reels", "YouTube Shorts"],
		},
		{
			label: "Avg Campaign Budget",
			type: "NUMBER",
		},
		{
			label: "Account type",
			type: "SELECT",
			options: ["Prospect", "Customer", "Partner", "Churned"],
		},
		{
			label: "Segment",
			type: "SELECT",
			options: ["Enterprise", "Mid-Market", "SMB"],
		},
		{
			label: "Territory",
			type: "SELECT",
			options: ["AMER", "EMEA", "APAC", "India"],
		},
		{
			label: "Lifecycle stage",
			type: "SELECT",
			options: ["Lead", "MQL", "SQL", "Opportunity", "Customer"],
		},
		{
			label: "Lead source",
			type: "SELECT",
			options: [
				"Inbound",
				"Outbound",
				"Event",
				"Instagram DM",
				"YouTube Comment",
			],
		},
		{ label: "ICP fit score", type: "NUMBER" },
		{ label: "BDR owner", type: "USER" },
	],
	CONTACT: [
		{
			label: "Instagram Handle",
			type: "TEXT",
		},
		{
			label: "Subscriber / Follower Tier",
			type: "SELECT",
			options: ["Brand Manager", "Macro Creator", "Superfan"],
		},
		{
			label: "Engagement Rate (%)",
			type: "NUMBER",
		},
	],
	DEAL: [
		{
			label: "Deliverables Scope",
			type: "TEXT",
		},
		{
			label: "Exclusivity Window",
			type: "SELECT",
			options: ["None", "30 Days", "60 Days", "90 Days", "Category Exclusive"],
		},
		{
			label: "Affiliate / UTM Code",
			type: "TEXT",
		},
		{
			label: "Usage Rights",
			type: "SELECT",
			options: [
				"Organic Only",
				"30-Day Paid Whitelist",
				"90-Day Digital Ads",
				"Perpetual Commercial",
			],
		},
	],
} satisfies Record<"COMPANY" | "CONTACT" | "DEAL", readonly FieldTemplate[]>;
