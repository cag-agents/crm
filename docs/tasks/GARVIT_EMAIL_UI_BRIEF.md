# 📋 Antigravity Agent Prompt & Task Specification — Garvit (Email & Frontend Suite)

> **Instructions for Garvit:**
> Copy this entire markdown text and paste it directly into your **Google Antigravity IDE** chat. It contains everything Antigravity needs to set up your environment, follow Next.js and backend conventions, and build the Email Service, Unified Inbox UI, Analytics Dashboard, and RBAC Panel to completion.

---

```markdown
You are an autonomous senior full-stack engineer working on the **CAG-Agents Omnichannel CRM Platform**.
You are working on behalf of **Garvit**.

## 🎯 Your Mission
Deliver two interconnected systems for the CRM platform:
1. **Email Management Service** (`services/email/`): Complete inbound IMAP/Gmail polling and outbound SMTP dispatch.
2. **Frontend Omnichannel Suite** in `apps/app/`:
   - **Unified Inbox UI** (`apps/app/app/(app)/[slug]/inbox/page.tsx`)
   - **Analytics Dashboard** (`apps/app/app/(app)/[slug]/analytics/page.tsx`)
   - **RBAC Admin Panel & Module Toggles** (`apps/app/app/(app)/[slug]/settings/roles/page.tsx`)

---

## 🛠️ Step 1: Git Branch & Workspace Initialization

Run the following commands in the project root:
```bash
# 1. Fetch latest changes from develop
git checkout develop
git pull origin develop

# 2. Create your feature branch
git checkout -b feature/garvit-inbox-and-email

# 3. Verify packages and database types
bun install
bun --filter @crm/db build
```

---

## 📂 Part 1: Email Management Service (`services/email/`)

You own `services/email/`.
Reference working microservice examples:
- `services/meta-social/` (Hono + `@crm/db`)
- `services/gateway/`

### 1. File Structure
```
services/email/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts        # Hono server (Health check, GET /api/emails, POST /api/email/send)
    ├── parser.ts       # Parses raw RFC 822 email headers, body (HTML & text), attachments, thread headers (In-Reply-To, References)
    ├── receiver.ts     # Inbound email ingester: syncs email into db.conversation and db.message
    ├── sender.ts       # Outbound SMTP / API email sender: maintains message thread headers
    ├── types.ts        # Email message & provider types
    └── email.test.ts   # Bun unit tests
```

### 2. `services/email/package.json`
```json
{
  "name": "@crm/email",
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

### 3. Core Database Operations in `receiver.ts` & `sender.ts`:
- Find or create `db.channel` (`type: "EMAIL"`).
- Find or create `db.contact` by email address.
- Upsert `db.conversation` with `channelId` and `externalThreadId: rfcMessageId` or thread subject.
- Save to `db.message` (`direction: "INBOUND" | "OUTBOUND"`, `content: emailBody`, `contentType: "TEXT"`).
- Update `conversation.lastMessageAt` and snippet.

---

## 🎨 Part 2: Frontend Omnichannel Suite in `apps/app/`

The frontend is a **Next.js App Router** project located in `apps/app/app/(app)/[slug]/`.

### 1. Unified Inbox (`apps/app/app/(app)/[slug]/inbox/page.tsx`)
Create a modern, responsive 3-pane layout:
- **Pane 1 (Channels Filter - Left)**:
  - All Channels, WhatsApp, Instagram, Facebook, Email badges with unread counters.
- **Pane 2 (Conversation List - Center)**:
  - Search bar + status filter (Open, Closed, Snoozed).
  - Conversation card showing: Contact name/avatar, channel badge (WhatsApp / IG / FB / Email), timestamp, last message snippet, unread counter badge.
- **Pane 3 (Chat Thread & Reply Box - Right)**:
  - Header: Contact info, assigned agent, status badge, channel origin.
  - Message Thread: Bubbles for Inbound (customer) and Outbound (agent/bot), media preview, timestamp, status checks (sent, delivered, read).
  - Reply Box: Text area, attachment button, canned quick replies, and "Send" button.

### 2. Analytics Dashboard (`apps/app/app/(app)/[slug]/analytics/page.tsx`)
Build an omnichannel insights dashboard:
- **KPI Cards**:
  - Total Messages Handled (with week-over-week % change).
  - Average First Response Time (e.g. 2m 45s).
  - Conversation Resolution Rate (e.g. 94.2%).
  - Active CSW Open Windows (WhatsApp).
- **Charts / Visual Breakdown**:
  - Channel Volume Breakdown (WhatsApp vs Instagram vs Facebook vs Email).
  - Inbound vs Outbound volume over the past 7 days.
  - Hourly peak message traffic heatmap/bar chart.

### 3. RBAC Admin Panel & Module Toggles (`apps/app/app/(app)/[slug]/settings/roles/page.tsx`)
Build an administrative control panel:
- **Module Feature Toggles (Switches)**:
  - Enable/Disable WhatsApp Integration.
  - Enable/Disable Meta (Facebook & Instagram) Integration.
  - Enable/Disable Email Management.
  - Enable/Disable n8n AI Auto-Responder.
- **Role Permissions Table**:
  - Roles: `Admin`, `Support Manager`, `Sales Agent`, `Read-only Viewer`.
  - Matrix permissions: View Conversations, Send Messages, Delete/Close Threads, Modify Channel Settings, Access Analytics.

---

## 🧪 Step 3: Verification & Quality Checks

Run all verification tasks before pushing:
```bash
# 1. Test the email service
bun test services/email

# 2. Check TypeScript types across email & app
bun --filter @crm/email check-types
bun --filter app check-types

# 3. Check Biome lint
bun --filter @crm/email lint
```

---

## 🚀 Step 4: Commit & Push Pull Request

When all checks pass cleanly:
```bash
git add services/email apps/app bun.lock
git commit -m "[FEAT] Add Email management service, Unified Inbox, Analytics, and RBAC admin panel"
git push origin feature/garvit-inbox-and-email
```
Then visit GitHub and open a Pull Request from `feature/garvit-inbox-and-email` into `develop`.
```
