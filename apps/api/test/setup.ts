if (!process.env.GOOGLE_CLIENT_ID) {
	process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
	process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
}

import { afterAll } from "bun:test";

afterAll(async () => {
	if (!process.env.DATABASE_URL) return;
	const { db } = await import("@crm/db");
	await db.$disconnect();
});
