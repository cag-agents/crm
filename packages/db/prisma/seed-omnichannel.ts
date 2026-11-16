import { db } from "../src";

export async function seedOmnichannel() {
	console.log("Seeding Omnichannel channels, conversations, and messages...");

	// 1. Ensure Organization
	const org = await db.organization.upsert({
		where: { id: "workspace" },
		create: {
			id: "workspace",
			name: "CAG CRM",
			slug: "crm",
			createdAt: new Date(),
		},
		update: {},
	});

	// 2. Fetch sample contacts
	const contacts = await db.contact.findMany({ take: 4 });
	if (contacts.length === 0) {
		console.warn("No contacts found. Please run base seed first.");
		return;
	}

	const [c1, c2, c3, c4] = contacts;
	const user = await db.user.findFirst({ where: { email: "ada@trycomp.ai" } });
	const userId = user?.id;

	// 3. Upsert Channels
	const waChannel = await db.channel.upsert({
		where: { id: "chan-whatsapp-default" },
		create: {
			id: "chan-whatsapp-default",
			name: "WhatsApp Official Cloud",
			type: "WHATSAPP",
			status: "ACTIVE",
			identifier: "1375157129023481",
			organizationId: org.id,
			config: {
				phoneNumberId: "1375157129023481",
				businessAccountId: "1675422214084687",
			},
		},
		update: {},
	});

	const igChannel = await db.channel.upsert({
		where: { id: "chan-instagram-default" },
		create: {
			id: "chan-instagram-default",
			name: "Instagram Direct",
			type: "INSTAGRAM",
			status: "ACTIVE",
			identifier: "cag_crm_support",
			organizationId: org.id,
		},
		update: {},
	});

	const fbChannel = await db.channel.upsert({
		where: { id: "chan-facebook-default" },
		create: {
			id: "chan-facebook-default",
			name: "Facebook Messenger",
			type: "FACEBOOK",
			status: "ACTIVE",
			identifier: "cag_crm_fb",
			organizationId: org.id,
		},
		update: {},
	});

	const emailChannel = await db.channel.upsert({
		where: { id: "chan-email-default" },
		create: {
			id: "chan-email-default",
			name: "Corporate Support Email",
			type: "EMAIL",
			status: "ACTIVE",
			identifier: "support@cag-crm.com",
			organizationId: org.id,
			config: {
				smtpHost: "localhost",
				smtpPort: 1025,
			},
		},
		update: {},
	});

	// 4. Conversation 1: WhatsApp
	const convWa = await db.conversation.upsert({
		where: { id: "conv-wa-demo-1" },
		create: {
			id: "conv-wa-demo-1",
			channelId: waChannel.id,
			contactId: c1?.id,
			companyId: c1?.companyId,
			externalThreadId: c1?.phone || "+14155559948",
			title: `WhatsApp with ${c1?.firstName ?? "Lena"} ${c1?.lastName ?? "Bergström"}`,
			status: "OPEN",
			priority: "HIGH",
			assignedToId: userId,
			unreadCount: 1,
			lastMessageSnippet:
				"Can you share the pricing sheet for 50+ enterprise seats?",
			lastMessageAt: new Date(Date.now() - 5 * 60 * 1000),
			metadata: {
				customerServiceWindowExpiresAt: new Date(
					Date.now() + 20 * 60 * 60 * 1000,
				).toISOString(),
				customerPhone: c1?.phone || "+14155559948",
			},
		},
		update: {},
	});

	await db.message.createMany({
		data: [
			{
				conversationId: convWa.id,
				externalMessageId: "wamid.demo.inbound.1",
				direction: "INBOUND",
				senderType: "CONTACT",
				senderName: `${c1?.firstName ?? "Lena"}`,
				content:
					"Hi Ada, we're evaluating the CRM for our EMEA sales team. Does your WhatsApp Cloud API support automatic lead enrichment?",
				contentType: "TEXT",
				deliveryStatus: "READ",
				sentAt: new Date(Date.now() - 30 * 60 * 1000),
			},
			{
				conversationId: convWa.id,
				externalMessageId: "wamid.demo.outbound.1",
				direction: "OUTBOUND",
				senderType: "USER",
				senderId: userId,
				senderName: "Ada Okafor",
				content:
					"Hi Lena! Yes, absolutely. Our WhatsApp microservice parses inbound contacts and triggers n8n enrichment workflows automatically.",
				contentType: "TEXT",
				deliveryStatus: "DELIVERED",
				sentAt: new Date(Date.now() - 15 * 60 * 1000),
			},
			{
				conversationId: convWa.id,
				externalMessageId: "wamid.demo.inbound.2",
				direction: "INBOUND",
				senderType: "CONTACT",
				senderName: `${c1?.firstName ?? "Lena"}`,
				content: "Can you share the pricing sheet for 50+ enterprise seats?",
				contentType: "TEXT",
				deliveryStatus: "DELIVERED",
				sentAt: new Date(Date.now() - 5 * 60 * 1000),
			},
		],
		skipDuplicates: true,
	});

	// 5. Conversation 2: Instagram
	const convIg = await db.conversation.upsert({
		where: { id: "conv-ig-demo-2" },
		create: {
			id: "conv-ig-demo-2",
			channelId: igChannel.id,
			contactId: c2?.id,
			companyId: c2?.companyId,
			externalThreadId: "ig_thread_78945612",
			title: `Instagram DM: @${(c2?.firstName ?? "hana").toLowerCase()}_tech`,
			status: "OPEN",
			priority: "NORMAL",
			assignedToId: userId,
			unreadCount: 0,
			lastMessageSnippet: "Would love to see the multi-channel dispatch demo!",
			lastMessageAt: new Date(Date.now() - 45 * 60 * 1000),
		},
		update: {},
	});

	await db.message.createMany({
		data: [
			{
				conversationId: convIg.id,
				externalMessageId: "ig.mid.demo.1",
				direction: "INBOUND",
				senderType: "CONTACT",
				senderName: `${c2?.firstName ?? "Kofi"}`,
				content:
					"Hey! Loved your omnichannel dashboard preview on Twitter. When is the public beta available?",
				contentType: "TEXT",
				deliveryStatus: "READ",
				sentAt: new Date(Date.now() - 60 * 60 * 1000),
			},
			{
				conversationId: convIg.id,
				externalMessageId: "ig.mid.demo.2",
				direction: "OUTBOUND",
				senderType: "USER",
				senderId: userId,
				senderName: "Ada Okafor",
				content:
					"Thanks! We are onboarding design partners this week. Would you like a demo walkthrough tomorrow?",
				contentType: "TEXT",
				deliveryStatus: "READ",
				sentAt: new Date(Date.now() - 50 * 60 * 1000),
			},
			{
				conversationId: convIg.id,
				externalMessageId: "ig.mid.demo.3",
				direction: "INBOUND",
				senderType: "CONTACT",
				senderName: `${c2?.firstName ?? "Kofi"}`,
				content: "Would love to see the multi-channel dispatch demo!",
				contentType: "TEXT",
				deliveryStatus: "DELIVERED",
				sentAt: new Date(Date.now() - 45 * 60 * 1000),
			},
		],
		skipDuplicates: true,
	});

	// 6. Conversation 3: Facebook Messenger
	const convFb = await db.conversation.upsert({
		where: { id: "conv-fb-demo-3" },
		create: {
			id: "conv-fb-demo-3",
			channelId: fbChannel.id,
			contactId: c3?.id,
			companyId: c3?.companyId,
			externalThreadId: "fb_psid_456123789",
			title: `Facebook Chat: ${c3?.firstName ?? "Hana"} ${c3?.lastName ?? "Adeyemi"}`,
			status: "OPEN",
			priority: "NORMAL",
			unreadCount: 0,
			lastMessageSnippet:
				"All our webhooks use HMAC-SHA256 signature validation.",
			lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
		},
		update: {},
	});

	await db.message.createMany({
		data: [
			{
				conversationId: convFb.id,
				externalMessageId: "fb.mid.demo.1",
				direction: "INBOUND",
				senderType: "CONTACT",
				senderName: `${c3?.firstName ?? "Hana"}`,
				content:
					"Hello, checking in regarding webhook verification and payload signature verification.",
				contentType: "TEXT",
				deliveryStatus: "READ",
				sentAt: new Date(Date.now() - 150 * 60 * 1000),
			},
			{
				conversationId: convFb.id,
				externalMessageId: "fb.mid.demo.2",
				direction: "OUTBOUND",
				senderType: "USER",
				senderId: userId,
				senderName: "Ada Okafor",
				content:
					"All our webhooks use HMAC-SHA256 signature validation with timing-safe comparison.",
				contentType: "TEXT",
				deliveryStatus: "READ",
				sentAt: new Date(Date.now() - 120 * 60 * 1000),
			},
		],
		skipDuplicates: true,
	});

	// 7. Conversation 4: Email Thread
	const convEmail = await db.conversation.upsert({
		where: { id: "conv-email-demo-4" },
		create: {
			id: "conv-email-demo-4",
			channelId: emailChannel.id,
			contactId: c4?.id,
			companyId: c4?.companyId,
			externalThreadId: c4?.email || "omar.rossi@linear.app",
			title: `Re: Enterprise SLA Agreement and Terms`,
			status: "OPEN",
			priority: "URGENT",
			assignedToId: userId,
			unreadCount: 1,
			lastMessageSnippet:
				"Ada, our legal counsel has reviewed the DPA addendum. Ready for countersignature.",
			lastMessageAt: new Date(Date.now() - 10 * 60 * 1000),
			metadata: {
				subject: "Re: Enterprise SLA Agreement and Terms",
			},
		},
		update: {},
	});

	await db.message.createMany({
		data: [
			{
				conversationId: convEmail.id,
				externalMessageId: `<rfc822.demo.1@linear.app>`,
				direction: "INBOUND",
				senderType: "CONTACT",
				senderName: `${c4?.firstName ?? "Omar"} ${c4?.lastName ?? "Rossi"}`,
				content:
					"Ada, our legal counsel has reviewed the data processing addendum. Please see attached comments regarding GDPR compliance.",
				contentType: "TEXT",
				deliveryStatus: "READ",
				sentAt: new Date(Date.now() - 80 * 60 * 1000),
			},
			{
				conversationId: convEmail.id,
				externalMessageId: `<rfc822.demo.2@cag-crm.com>`,
				direction: "OUTBOUND",
				senderType: "USER",
				senderId: userId,
				senderName: "Ada Okafor",
				content:
					"Thank you Omar. Our security team has approved the DPA without exceptions. We're ready for countersignature.",
				contentType: "TEXT",
				deliveryStatus: "SENT",
				sentAt: new Date(Date.now() - 40 * 60 * 1000),
			},
			{
				conversationId: convEmail.id,
				externalMessageId: `<rfc822.demo.3@linear.app>`,
				direction: "INBOUND",
				senderType: "CONTACT",
				senderName: `${c4?.firstName ?? "Omar"} ${c4?.lastName ?? "Rossi"}`,
				content:
					"Ada, our legal counsel has reviewed the DPA addendum. Ready for countersignature.",
				contentType: "TEXT",
				deliveryStatus: "DELIVERED",
				sentAt: new Date(Date.now() - 10 * 60 * 1000),
			},
		],
		skipDuplicates: true,
	});

	console.log(
		"Successfully seeded 4 Omnichannel channels, 4 conversations, and 10 rich messages!",
	);
}

if (import.meta.main) {
	seedOmnichannel()
		.then(() => process.exit(0))
		.catch((err) => {
			console.error(err);
			process.exit(1);
		});
}
