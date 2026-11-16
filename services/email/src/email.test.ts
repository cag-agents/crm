import { describe, expect, it } from "bun:test";
import {
  decodeMimeWords,
  decodeQuotedPrintable,
  parseEmailAddress,
  parseEmailAddressList,
  parseRawHeaders,
  parseRfc822Email,
} from "./parser";
import { buildRfc822Headers } from "./sender";
import app from "./index";

describe("Email Parser (RFC 822 & MIME)", () => {
  it("should decode quoted-printable content correctly", () => {
    const raw = "Hello=20World=21=0D=0AThis is a test=2E";
    const decoded = decodeQuotedPrintable(raw);
    expect(decoded).toContain("Hello World!");
    expect(decoded).toContain("This is a test.");
  });

  it("should handle soft line breaks in quoted-printable", () => {
    const raw = "Long text that is split across lines=\nwith a soft break";
    const decoded = decodeQuotedPrintable(raw);
    expect(decoded).toBe("Long text that is split across lineswith a soft break");
  });

  it("should decode MIME encoded-words", () => {
    // =?utf-8?B?SGVsbG8gV29ybGQ=?= -> Hello World
    const encoded = "=?utf-8?B?SGVsbG8gV29ybGQ=?=";
    expect(decodeMimeWords(encoded)).toBe("Hello World");
  });

  it("should parse single email address correctly", () => {
    const parsed1 = parseEmailAddress("John Doe <john.doe@example.com>");
    expect(parsed1.name).toBe("John Doe");
    expect(parsed1.address).toBe("john.doe@example.com");

    const parsed2 = parseEmailAddress("<alice@acme.corp>");
    expect(parsed2.address).toBe("alice@acme.corp");

    const parsed3 = parseEmailAddress("bob@domain.org");
    expect(parsed3.address).toBe("bob@domain.org");
  });

  it("should parse multiple email addresses", () => {
    const raw = 'Alice <alice@test.com>, "Bob, Jr." <bob@test.com>, carol@test.com';
    const list = parseEmailAddressList(raw);
    expect(list.length).toBe(3);
    expect(list[0]?.address).toBe("alice@test.com");
    expect(list[2]?.address).toBe("carol@test.com");
  });

  it("should parse raw headers with unfolding", () => {
    const rawHeaders = [
      "From: sender@example.com",
      "Subject: Test Subject",
      "  with unfolded continuation line",
      "Message-ID: <msg-12345@domain.com>",
      "In-Reply-To: <parent-67890@domain.com>",
      "References: <root-00001@domain.com> <parent-67890@domain.com>",
    ].join("\r\n");

    const headers = parseRawHeaders(rawHeaders);
    expect(headers.from).toBe("sender@example.com");
    expect(headers.subject).toBe("Test Subject with unfolded continuation line");
    expect(headers["message-id"]).toBe("<msg-12345@domain.com>");
    expect(headers["in-reply-to"]).toBe("<parent-67890@domain.com>");
  });

  it("should parse simple plain text RFC 822 email", () => {
    const raw = [
      "From: Customer Support <support@customer.com>",
      "To: agent@cag-crm.internal",
      "Subject: Need help with order #992",
      "Message-ID: <order-992@customer.com>",
      "Date: Mon, 16 Nov 2026 12:00:00 GMT",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Hello, I need an update on my shipment status. Thanks!",
    ].join("\r\n");

    const email = parseRfc822Email(raw);
    expect(email.messageId).toBe("order-992@customer.com");
    expect(email.from.address).toBe("support@customer.com");
    expect(email.from.name).toBe("Customer Support");
    expect(email.subject).toBe("Need help with order #992");
    expect(email.text).toBe("Hello, I need an update on my shipment status. Thanks!");
    expect(email.attachments.length).toBe(0);
  });

  it("should parse multipart/alternative email with text and HTML", () => {
    const boundary = "boundary42";
    const raw = [
      "From: marketing@brand.com",
      "To: user@cag-crm.internal",
      "Subject: Weekly Newsletter",
      "Message-ID: <news-42@brand.com>",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Plain text version of newsletter",
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      "<h1>HTML version of newsletter</h1>",
      `--${boundary}--`,
    ].join("\r\n");

    const email = parseRfc822Email(raw);
    expect(email.messageId).toBe("news-42@brand.com");
    expect(email.text).toBe("Plain text version of newsletter");
    expect(email.html).toBe("<h1>HTML version of newsletter</h1>");
  });

  it("should parse multipart/mixed email with attachment", () => {
    const boundary = "mixed_bound";
    const raw = [
      "From: invoices@vendor.com",
      "To: billing@cag-crm.internal",
      "Subject: Invoice #1024",
      "Message-ID: <inv-1024@vendor.com>",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain",
      "",
      "Please find attached your invoice.",
      `--${boundary}`,
      'Content-Type: application/pdf; name="invoice.pdf"',
      'Content-Disposition: attachment; filename="invoice.pdf"',
      "Content-Transfer-Encoding: base64",
      "",
      "JVBERi0xLjQKJcfsj6IK",
      `--${boundary}--`,
    ].join("\r\n");

    const email = parseRfc822Email(raw);
    expect(email.text).toBe("Please find attached your invoice.");
    expect(email.attachments.length).toBe(1);
    expect(email.attachments[0]?.filename).toBe("invoice.pdf");
    expect(email.attachments[0]?.contentType).toBe("application/pdf");
  });
});

describe("Outbound RFC 822 Header Generation", () => {
  it("should generate valid threading headers", () => {
    const headers = buildRfc822Headers({
      from: "agent@cag-crm.internal",
      to: "customer@example.com",
      subject: "Re: Need help with order #992",
      messageId: "reply-001@cag-crm.internal",
      inReplyTo: "order-992@customer.com",
      references: ["order-992@customer.com"],
    });

    expect(headers).toContain("From: agent@cag-crm.internal");
    expect(headers).toContain("To: customer@example.com");
    expect(headers).toContain("Subject: Re: Need help with order #992");
    expect(headers).toContain("Message-ID: <reply-001@cag-crm.internal>");
    expect(headers).toContain("In-Reply-To: <order-992@customer.com>");
    expect(headers).toContain("References: <order-992@customer.com>");
  });
});

describe("Email Hono Service API", () => {
  it("GET /health should return status ok", async () => {
    const res = await app.fetch(new Request("http://localhost/health"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; service: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("email");
  });

  it("POST /api/email/send should validate missing body", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
  });
});
