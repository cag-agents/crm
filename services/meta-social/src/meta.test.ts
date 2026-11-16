import { describe, expect, it } from "bun:test";
import appObj from "./index";

describe("Meta Social Service Webhook Tests", () => {
  it("GET /health returns status ok", async () => {
    const res = await appObj.fetch(new Request("http://localhost:3003/health"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.service).toBe("meta-social");
  });

  it("GET /webhook/meta verifies with valid token", async () => {
    const challenge = "CHALLENGE_STRING_12345";
    const token = process.env.META_WEBHOOK_VERIFY_TOKEN || "cag_crm_meta_token";

    const res = await appObj.fetch(
      new Request(
        `http://localhost:3003/webhook/meta?hub.mode=subscribe&hub.verify_token=${token}&hub.challenge=${challenge}`
      )
    );

    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe(challenge);
  });

  it("GET /webhook/meta rejects invalid token", async () => {
    const res = await appObj.fetch(
      new Request(
        "http://localhost:3003/webhook/meta?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=123"
      )
    );

    expect(res.status).toBe(403);
  });

  it("POST /webhook/meta returns 200 EVENT_RECEIVED for valid payload structure", async () => {
    const samplePayload = {
      object: "page",
      entry: [
        {
          id: "page_123456",
          time: Date.now(),
          messaging: [
            {
              sender: { id: "user_789" },
              recipient: { id: "page_123456" },
              timestamp: Date.now(),
              message: {
                mid: "mid_test_123",
                text: "Hello from test!",
              },
            },
          ],
        },
      ],
    };

    const res = await appObj.fetch(
      new Request("http://localhost:3003/webhook/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(samplePayload),
      })
    );

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("EVENT_RECEIVED");
  });

  it("POST /webhook/meta processes social comments change event", async () => {
    const commentPayload = {
      object: "page",
      entry: [
        {
          id: "page_123456",
          time: Date.now(),
          changes: [
            {
              field: "feed",
              value: {
                item: "comment",
                verb: "add",
                comment_id: "comment_999",
                post_id: "post_888",
                message: "Love this product, where can I buy?",
                created_time: Math.floor(Date.now() / 1000),
                from: {
                  id: "customer_555",
                  name: "Alice Smith",
                },
              },
            },
          ],
        },
      ],
    };

    const res = await appObj.fetch(
      new Request("http://localhost:3003/webhook/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commentPayload),
      })
    );

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("EVENT_RECEIVED");
  });
});
