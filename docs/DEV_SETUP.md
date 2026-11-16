# Dev Environment Setup Guide

> **For: Ashish & Garvit** (and any future contributors)
> **Author: Chhayansh**

## Prerequisites

Install these before anything else:

### 1. Bun (JavaScript runtime — we use this instead of Node.js)

```bash
curl -fsSL https://bun.sh/install | bash
```

After install, restart your terminal and verify:

```bash
bun --version
# Should show 1.3.x or higher
```

### 2. Docker Desktop

Download and install from: https://www.docker.com/products/docker-desktop/

After install, verify:

```bash
docker --version
docker compose version
```

### 3. Git

```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt install git

# Windows
# Download from https://git-scm.com/
```

### 4. VS Code (Recommended) or Cursor

Extensions to install:
- **Biome** — linter/formatter (replaces ESLint + Prettier for this project)
- **Prisma** — database schema syntax highlighting
- **GitLens** — Git blame & history

---

## Clone & Run

### Step 1: Clone the repo

```bash
git clone https://github.com/cag-agents/crm.git
cd crm
```

### Step 2: Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and set these **minimum required** values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crm?schema=public"
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crm_test?schema=public"
BETTER_AUTH_SECRET="generate-with-openssl-rand-base64-32"
ALLOWED_SIGN_IN="your-email@gmail.com"
REDIS_URL="redis://localhost:6379"
```

Generate a secret:

```bash
openssl rand -base64 32
# Copy the output into BETTER_AUTH_SECRET
```

### Step 3: Start infrastructure (PostgreSQL, Redis, Kafka)

```bash
docker compose up -d
```

Verify everything is running:

```bash
docker compose ps
# Should show: crm-postgres, crm-redis, crm-kafka, crm-kafka-ui all "Up"
```

### Step 4: Install dependencies

```bash
bun install
```

### Step 5: Run database migrations

```bash
bun run db:deploy
```

### Step 6: Seed the database (optional, adds demo data)

```bash
bun run db:seed
```

### Step 7: Start the dev server

```bash
bun run dev
```

This starts:
- **Web CRM** at `http://localhost:3000`
- **API** at `http://localhost:3001`

### Step 8: Verify it works

1. Open `http://localhost:3000` in your browser
2. You should see the CRM sign-in page
3. Kafka UI is at `http://localhost:8080` (for debugging event streams)

---

## Git Workflow

### First time setup — create the `develop` branch locally

```bash
git checkout -b develop
git push -u origin develop
```

### Starting a new feature

```bash
# Always branch from develop
git checkout develop
git pull origin develop

# Create your feature branch
# Pattern: feature/<your-name>-<feature-description>
git checkout -b feature/ashish-rate-limiter
# or
git checkout -b feature/garvit-inbox-ui
```

### Committing your work

```bash
git add .
git commit -m "[FEATURE] Add rate limiter library"
# or
git commit -m "[FIX] Fix inbox scroll issue"
# or
git commit -m "[CHORE] Update dependencies"
```

### Pushing and creating a PR

```bash
git push -u origin feature/ashish-rate-limiter
```

Then go to GitHub and create a PR **targeting `develop`** (NOT `main`).

### Before pushing — run these checks locally

```bash
bun run lint          # Linter
bun run check-types   # TypeScript types
bun run test          # Unit tests
```

If any of these fail, fix them before pushing. CI will run the same checks.

---

## Project Structure (What's Where)

```
crm-platform/
├── apps/
│   ├── app/          ← Web CRM frontend (Next.js) — Garvit works here mostly
│   ├── api/          ← Backend API server — Chhayansh owns this
│   └── agent/        ← AI Agent (eve framework) — Chhayansh owns this
├── services/
│   └── gateway/      ← Edge API Gateway for webhooks — Chhayansh owns this
│   (More services will be added: meta-social/, rate-limiter/, email/, etc.)
├── packages/
│   ├── db/           ← Database schema (Prisma) — ALL must review changes
│   ├── auth/         ← Authentication
│   ├── ui/           ← Shared React components — Garvit works here
│   ├── env/          ← Environment variable validation
│   ├── validation/   ← Input validation schemas (Zod)
│   └── telemetry/    ← Usage telemetry
├── docker-compose.yml ← Local dev infrastructure
└── .github/          ← CI/CD, PR templates, CODEOWNERS
```

---

## Common Commands

| Command | What it does |
|---------|-------------|
| `bun run dev` | Start all dev servers |
| `bun run build` | Build everything |
| `bun run lint` | Lint all code |
| `bun run check-types` | TypeScript type checking |
| `bun run test` | Run all tests |
| `bun run db:studio` | Open Prisma Studio (visual DB browser) |
| `bun run db:migrate` | Create a new migration |
| `bun run db:deploy` | Apply pending migrations |
| `bun run db:seed` | Seed database with demo data |
| `docker compose up -d` | Start PostgreSQL + Redis + Kafka |
| `docker compose down` | Stop all infrastructure |
| `docker compose logs -f kafka` | Tail Kafka logs |

---

## Troubleshooting

### "Port 5432 already in use"
You have another PostgreSQL running. Either stop it or change the port in `docker-compose.yml`.

```bash
# macOS — stop local Postgres
brew services stop postgresql
```

### "bun install fails"
Make sure you're using Bun 1.3.x:
```bash
bun upgrade
```

### "Database migrations fail"
Make sure PostgreSQL is running:
```bash
docker compose ps
# If postgres is not running:
docker compose up postgres -d
```

### "Redis connection refused"
```bash
docker compose up redis -d
```

---

## Questions?

Ask Chhayansh in the team group, or open a GitHub Issue with the `question` label.
