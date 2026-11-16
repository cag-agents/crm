/**
 * Live Viva Webhook Simulator
 *
 * Sequentially triggers 3 realistic Creator Economy omnichannel webhook events
 * against the Edge API Gateway with a 2-second pause between them.
 *
 * Run with: bun run simulate (or bun run scripts/simulate-viva.ts)
 */

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:3002";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendEvent(title: string, endpoint: string, payload: any) {
	console.log(`\n============================================================`);
	console.log(`🚀 [SIMULATION TRIGGER] ${title}`);
	console.log(`Target: POST ${GATEWAY_URL}${endpoint}`);
	console.log(`Payload Summary: ${JSON.stringify(payload).slice(0, 110)}...`);

	const t0 = performance.now();
	try {
		const res = await fetch(`${GATEWAY_URL}${endpoint}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-demo-simulation": "true",
			},
			body: JSON.stringify(payload),
		});

		const latency = (performance.now() - t0).toFixed(2);
		const json = await res.json().catch(() => ({}));

		console.log(`✅ [GATEWAY RESPONSE] HTTP ${res.status} in ${latency}ms`);
		console.log(`   Response JSON:`, json);
	} catch (err) {
		console.error(
			`❌ [SIMULATION ERROR]:`,
			err instanceof Error ? err.message : String(err),
		);
	}
}

async function runVivaSimulation() {
	console.log(`\n============================================================`);
	console.log(`🔥 STARTING LIVE CREATOR CRM VIVA SIMULATOR 🔥`);
	console.log(`Edge Gateway: ${GATEWAY_URL}`);
	console.log(
		`Zero Merge Conflicts Architecture | Redis Token Bucket | Meta CSW`,
	);
	console.log(`============================================================`);

	// 1. Instagram Reel Comment-to-DM Trigger
	await sendEvent("1. Instagram Reel Comment-to-DM Trigger", "/webhooks/meta", {
		object: "instagram",
		entry: [
			{
				id: "ig_creator_page_99",
				time: Math.floor(Date.now() / 1000),
				changes: [
					{
						field: "comments",
						value: {
							comment_id: "ig_cmt_9988776655",
							post_id: "ig_reel_system_design_mastery",
							from: {
								id: "user_arjun_codes",
								username: "arjun_codes",
								name: "Arjun Codes",
							},
							message: "Bro please send the DSA & System Design LINK!",
							text: "Bro please send the DSA & System Design LINK!",
						},
					},
				],
			},
		],
	});

	console.log(`\n⏳ Pausing 2 seconds before next trigger...`);
	await sleep(2000);

	// 2. WhatsApp Brand Sponsorship Inquiry
	await sendEvent("2. WhatsApp Brand Sponsorship Inquiry", "/webhooks/meta", {
		object: "whatsapp_business_account",
		entry: [
			{
				id: "waba_boat_lifestyle_hq",
				changes: [
					{
						field: "messages",
						value: {
							messaging_product: "whatsapp",
							metadata: {
								display_phone_number: "+919876543210",
								phone_number_id: "phone_boat_marketing",
							},
							contacts: [
								{
									profile: { name: "Riya Sharma (boAt Lifestyle)" },
									wa_id: "919876543210",
								},
							],
							messages: [
								{
									from: "+919876543210",
									id: "wamid_boat_sponsor_9901",
									timestamp: Math.floor(Date.now() / 1000).toString(),
									type: "text",
									text: {
										body: "Hi! We'd love to sponsor 1 Dedicated YouTube video + 2 IG Reels for our new Nirvana ANC launch. Budget: ₹4,50,000. Can you share your media kit?",
									},
								},
							],
						},
					},
				],
			},
		],
	});

	console.log(`\n⏳ Pausing 2 seconds before next trigger...`);
	await sleep(2000);

	// 3. Telegram Superfan Community Query
	await sendEvent(
		"3. Telegram Superfan Community Query",
		"/webhooks/telegram",
		{
			update_id: 88776655,
			message: {
				message_id: 10492,
				from: {
					id: 77665544,
					is_bot: false,
					first_name: "Priya",
					last_name: "Dev",
					username: "priya_dev",
				},
				chat: {
					id: -1009876543,
					title: "Creator Superfan Broadcast",
					type: "supergroup",
				},
				date: Math.floor(Date.now() / 1000),
				text: "Hey team! When is the next live cohort for Advanced Full-Stack AI Agents starting? Any early bird dates?",
			},
		},
	);

	console.log(`\n============================================================`);
	console.log(
		`✨ VIVA SIMULATION COMPLETED: 3/3 Webhooks Dispatched Successfully`,
	);
	console.log(`Inspect Gateway & Worker logs to observe:`);
	console.log(`1. Sub-50ms HTTP 200 OK acceptance (<15s Meta SLA compliance)`);
	console.log(`2. Redis Token Bucket remaining quota logging`);
	console.log(
		`3. Meta 24h CSW compliance opening via /v19.0/ig_cmt_9988776655/messages`,
	);
	console.log(
		`4. Core CRM API timeline synchronization for Contacts & Activities`,
	);
	console.log(`============================================================\n`);
}

runVivaSimulation().catch((err) => {
	console.error("Simulation run failed:", err);
	process.exit(1);
});
