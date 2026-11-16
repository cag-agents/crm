# 📋 Antigravity Agent Prompt & Task Specification — Ashish (WhatsApp Cloud API)

> **Instructions for Ashish:**
> Copy this entire markdown text and paste it directly into your **Google Antigravity IDE** chat. It contains everything Antigravity needs to set up your environment, follow project conventions, and build the WhatsApp service to completion.

---

```markdown
You are an autonomous senior backend software engineer working on the **CAG-Agents Omnichannel CRM Platform**.
You are working on behalf of **Ashish**.

## 🎯 Your Mission
Build the **WhatsApp Cloud API Microservice** to the fullest in `services/whatsapp/` to provide omnichannel messaging, template dispatch, media handling, and 24-hour Customer Service Window (CSW) tracking.

---

## 🛠️ Step 1: Git Branch & Workspace Initialization

Run the following commands in the project root:
```bash
# 1. Fetch latest changes from develop
git checkout develop
git pull origin develop

# 2. Create your feature branch
git checkout -b feature/ashish-whatsapp

# 3. Verify packages and database types
bun install
bun --filter @crm/db build
```

---

## 📂 Step 2: Architecture & File Structure

You own the folder: `services/whatsapp/`
Reference working implementations:
- `services/meta-social/` (similar microservice using Hono + `@crm/db`)
- `services/gateway/` (webhook ingestion and validation)

Create the following files in `services/whatsapp/`:
```
services/whatsapp/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts        # Hono server (Webhooks: GET /webhook/whatsapp, POST /webhook/whatsapp, POST /api/send, POST /api/template/send)
    ├── receiver.ts     # Inbound message parsing (text, images, documents, audio, location, button replies)
    ├── sender.ts       # Cloud API message dispatch (text, media, interactive messages)
    ├── templates.ts    # Pre-approved template message dispatch for business-initiated conversations
    ├── csw.ts          # 24-hour Customer Service Window tracker (blocks non-template outbound after 24h)
    ├── types.ts        # WhatsApp Cloud API payload & event TypeScript interfaces
    └── whatsapp.test.ts # Bun unit tests
```

---

## 🏗️ Step 3: Package & TypeScript Configuration

### `services/whatsapp/package.json`
```json
{
  "name": "@crm/whatsapp",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target bun",
    "start": "bun run dist/index.js",
    "lint": "biome lint src/",
    "check-types": "tsc --noEmit",
    "test": "bun test"
  },
  "dependencies": {
    "@crm/db": "workspace:*",
    "@crm/env": "workspace:*",
    "hono": "^4.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@crm/typescript-config": "workspace:*",
    "@types/bun": "latest",
    "typescript": "5.9.2"
  }
}
```

### `services/whatsapp/tsconfig.json`
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "@crm/typescript-config/internal-package.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["bun"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 📋 Step 4: Core Implementation Checklist

### 1. Webhook Handshake & Verification (`src/index.ts`)
- `GET /webhook/whatsapp`: Verify `hub.mode === 'subscribe'` and `hub.verify_token === process.env.WHATSAPP_VERIFY_TOKEN`, respond with `hub.challenge`.
- Health check `GET /health` returning `{ status: "ok", service: "whatsapp" }`.

### 2. Inbound Message Receiver (`src/receiver.ts`)
- Handle `POST /webhook/whatsapp`:
  - Audit log into `db.webhookEvent` (`channelType: "WHATSAPP"`).
  - Parse `entry[].changes[].value.messages[]`.
  - Support text, image, audio, video, document, and interactive button replies.
  - Automatically find or create `db.channel` (`type: "WHATSAPP"`, `identifier: phoneNumberId`).
  - Automatically find or create `db.contact` (using `from` phone number & `profile.name`).
  - Upsert `db.conversation` with `channelId` and `externalThreadId: fromPhone`.
  - Save to `db.message` (`direction: "INBOUND"`, `externalMessageId: message.id`, `deliveryStatus: "DELIVERED"`).
  - Update `conversation.lastMessageAt`, snippet, and increment `unreadCount`.
  - Update or set `cswExpiresAt = new Date(sentAt.getTime() + 24 * 60 * 60 * 1000)` in conversation metadata.

### 3. Outbound Message Sender (`src/sender.ts`)
- Call WhatsApp Cloud API endpoint: `https://graph.facebook.com/v21.0/{phone_number_id}/messages`
- Send text, media, or quick reply buttons using Bearer token (`WHATSAPP_ACCESS_TOKEN`).
- Before sending regular text/media, check CSW rule via `src/csw.ts`. If window is closed (>24h since customer's last message), reject unless sending a template.
- Save outbound message to `db.message` (`direction: "OUTBOUND"`, `deliveryStatus: "SENT"`).

### 4. Template Messaging Engine (`src/templates.ts`)
- `POST /api/template/send`: Dispatch pre-approved WhatsApp templates (e.g. `order_update`, `appointment_reminder`).
- Templates can be sent even outside the 24-hour service window.

### 5. Delivery Status Callbacks
- Parse `entry[].changes[].value.statuses[]` (`sent`, `delivered`, `read`, `failed`).
- Update matching `db.message` status by `externalMessageId`.

---

## 🧪 Step 5: Verification & Testing

Run these checks to make sure everything passes without errors:
```bash
# 1. Run unit tests
bun test services/whatsapp

# 2. Check TypeScript types
bun --filter @crm/whatsapp check-types

# 3. Check Biome linting
bun --filter @crm/whatsapp lint
```

---

## 🚀 Step 6: Commit & Push Pull Request

When all checks pass:
```bash
git add services/whatsapp bun.lock
git commit -m "[FEAT] Complete WhatsApp Cloud API microservice (webhooks, sender, CSW, templates)"
git push origin feature/ashish-whatsapp
```
Then visit GitHub and open a Pull Request from `feature/ashish-whatsapp` into `develop`.
```
