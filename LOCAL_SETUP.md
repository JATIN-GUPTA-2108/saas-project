# Local Development Setup — LearnFlow

This guide covers everything you need **before** and **during** running the LearnFlow LMS monorepo on your machine.

**Product:** LearnFlow  
**Stack:** NestJS API + Next.js web + PostgreSQL + Redis  
**Repo layout:** npm workspaces (`apps/api`, `apps/web`)

Related docs:

- [`ai_doc.md`](./ai_doc.md) — architecture and API reference
- [`phase-5.md`](./phase-5.md) — production deployment (not needed for local dev)

---

## Prerequisites

Install these **before** cloning or running the project.

### Required

| Tool | Version | Why |
|------|---------|-----|
| **Node.js** | **20+** (22 recommended) | API and web runtime; see root `package.json` `engines` |
| **npm** | 10+ (bundled with Node) | Workspace install and scripts |
| **Git** | Any recent | Clone the repository |
| **PostgreSQL** | **16** (or use Docker) | Primary database — Prisma connects here |
| **Redis** | **7** (or use Docker) | BullMQ job queues + Socket.io scaling adapter |

### Strongly recommended

| Tool | Why |
|------|-----|
| **Docker Desktop** | Easiest way to run Postgres + Redis without local installs |
| **A code editor** | VS Code / Cursor with TypeScript support |

### Optional

| Tool | Why |
|------|-----|
| **OpenAI or Anthropic API key** | Real AI quiz generation; without keys, a **mock generator** is used |
| **Stripe keys** | Not used yet — billing is local demo only (Phase 5) |

### Ports that must be free

| Port | Service |
|------|---------|
| `3000` | Next.js web app |
| `3001` | NestJS API (+ WebSocket) |
| `5432` | PostgreSQL |
| `6379` | Redis |

If something else uses these ports (local Postgres, another Redis, etc.), stop that service or change the port mapping in Docker / `.env`.

---

## What runs locally

```txt
Browser  →  Next.js ( :3000 )
                ↓ REST + uploads
           NestJS API ( :3001 )
                ↓              ↓
         PostgreSQL        Redis
           ( :5432 )       ( :6379 )
                ↓
         BullMQ workers (inside API process)
         Socket.io (/classroom namespace)
```

**Important:** Redis is **required** at runtime, not optional. Without it:

- Video upload processing jobs will not run
- AI quiz generation queue will not run
- Analytics event ingestion will not run
- Socket.io may fail to connect its Redis adapter

---

## Setup paths

Choose one approach:

| Approach | Best for | Postgres + Redis |
|----------|----------|------------------|
| **A — Native dev** (recommended) | Day-to-day coding, hot reload | Docker Compose for DB only |
| **B — Full Docker Compose** | Quick demo, minimal local tooling | Included in compose |

Most developers use **A**: run Postgres + Redis in Docker, run API and web with `npm run dev:*` on the host.

---

## Approach A — Native development (recommended)

### 1. Clone and install

```bash
git clone <your-repo-url> saas
cd saas
npm install
```

This installs dependencies for the root workspace and both apps.

### 2. Start PostgreSQL and Redis

From the repo root:

```bash
docker compose up -d postgres redis
```

Wait until both are healthy:

```bash
docker compose ps
```

You should see `postgres` and `redis` as running/healthy.

**Alternative — Redis only** (if you already have Postgres installed locally):

```bash
docker run -d --name lms-redis -p 6379:6379 redis:7-alpine
```

Ensure your local Postgres has a database matching the connection string below.

### 3. Configure environment variables

The template lives at the repo root: [`.env.example`](./.env.example).

#### API (`apps/api/.env`)

NestJS loads `.env` from the **API working directory** when you run `npm run dev:api`.

```bash
# From repo root (PowerShell)
copy .env.example apps\api\.env

# macOS / Linux
cp .env.example apps/api/.env
```

Edit `apps/api/.env` if needed. Defaults work with Docker Compose postgres/redis:

```env
DATABASE_URL=postgresql://lms:lms_secret@localhost:5432/lms_saas?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
API_PORT=3001
NODE_ENV=development
JWT_ACCESS_SECRET=change-me-access-secret-min-32-chars
JWT_REFRESH_SECRET=change-me-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

JWT secrets must be **at least 32 characters** in production; any long string is fine for local dev.

#### Web (`apps/web/.env.local`)

Next.js reads `NEXT_PUBLIC_*` variables from `apps/web/.env.local`:

```bash
# PowerShell
copy .env.example apps\web\.env.local

# macOS / Linux
cp .env.example apps/web/.env.local
```

Keep at least these (or create a minimal file):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

Restart the web dev server after changing `NEXT_PUBLIC_*` values.

### 4. Initialize the database

From the repo root:

```bash
cd apps/api
npx prisma db push
npx prisma db seed
cd ../..
```

Or use workspace scripts:

```bash
npm run db:seed
# db:push is run manually: cd apps/api && npx prisma db push
```

**What seed does:**

- System permissions (`course:create`, `audit:view`, `analytics:view`, etc.)
- Roles: `owner`, `admin`, `instructor`, `student`
- Role ↔ permission mappings

**Prisma version:** This project uses **Prisma 5.22.x**. Do not upgrade to Prisma 7 without migrating config.

### 5. Start the API

In **terminal 1** (repo root):

```bash
npm run dev:api
```

API listens on **http://localhost:3001**.

Verify:

- Health: http://localhost:3001/api/v1/health
- Swagger: http://localhost:3001/api/docs

### 6. Start the web app

In **terminal 2** (repo root):

```bash
npm run dev:web
```

Web app: **http://localhost:3000**

### 7. Create your first user

1. Open http://localhost:3000/register
2. Register with email + password
3. Registration creates a user **and** a default organization (you are `owner`)
4. You land in the dashboard with full permissions

No separate “create org” step is required for the first account.

---

## Approach B — Full Docker Compose

Runs postgres, redis, api, and web together.

### Steps

```bash
git clone <your-repo-url> saas
cd saas
docker compose up -d --build
```

Before first run, push schema + seed **into the postgres container**:

```bash
# Start postgres + redis only first
docker compose up -d postgres redis

# Run migrations/seed from your host (needs Node installed)
cd apps/api
copy ..\..\.env.example .env   # or cp on macOS/Linux
npx prisma db push
npx prisma db seed
cd ../..

# Then start everything
docker compose up -d --build
```

**Note:** The compose file mounts `./apps/api` into the API container for dev hot reload. JWT secrets in compose are **dev placeholders** — do not use in production.

| URL | Service |
|-----|---------|
| http://localhost:3000 | Web |
| http://localhost:3001/api/v1/health | API health |
| http://localhost:3001/api/docs | Swagger |

---

## Environment variable reference

| Variable | App | Required | Default / notes |
|----------|-----|----------|-----------------|
| `DATABASE_URL` | API | Yes | Postgres connection string |
| `REDIS_HOST` | API | Yes | `localhost` or `redis` in Docker |
| `REDIS_PORT` | API | Yes | `6379` |
| `API_PORT` | API | No | `3001` |
| `JWT_ACCESS_SECRET` | API | Yes | Min ~32 chars |
| `JWT_REFRESH_SECRET` | API | Yes | Min ~32 chars |
| `JWT_ACCESS_EXPIRES_IN` | API | No | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | API | No | `7d` |
| `CORS_ORIGIN` | API | No | `http://localhost:3000` |
| `OPENAI_API_KEY` | API | No | Mock AI if empty |
| `OPENAI_MODEL` | API | No | `gpt-4o-mini` |
| `ANTHROPIC_API_KEY` | API | No | Fallback provider |
| `ANTHROPIC_MODEL` | API | No | `claude-3-5-haiku-latest` |
| `NEXT_PUBLIC_API_URL` | Web | Yes | `http://localhost:3001/api/v1` |
| `NEXT_PUBLIC_WS_URL` | Web | Yes | `http://localhost:3001` |

Never commit `.env` or `.env.local` files.

---

## Useful commands

Run from **repo root** unless noted.

```bash
# Install dependencies
npm install

# Development
npm run dev:api          # NestJS watch mode
npm run dev:web          # Next.js dev server

# Build (verify everything compiles)
npm run build

# Lint
npm run lint

# Database (from apps/api or via cd)
cd apps/api
npx prisma db push       # sync schema (dev)
npx prisma db seed       # re-seed permissions/roles
npx prisma studio        # GUI for DB rows
npm run db:generate      # regenerate Prisma client after schema changes
```

---

## Verifying the stack

Use this checklist after setup:

| Check | How |
|-------|-----|
| API up | `curl http://localhost:3001/api/v1/health` → `{ "status": "ok", ... }` |
| DB connected | Register/login works without 500 errors |
| Redis connected | Upload a lesson video → status moves to `READY` after a few seconds (dev stub worker) |
| WebSocket | Open a course **Classroom** page → chat/presence works |
| AI quizzes | Generate quiz on a lesson → works with mock questions if no API keys |
| Analytics | Create/publish a course → events appear on `/dashboard/analytics` |
| Audit | `/dashboard/audit` visible for owner/admin |

---

## App URLs (local)

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Landing page |
| http://localhost:3000/login | Login |
| http://localhost:3000/register | Register + create workspace |
| http://localhost:3000/dashboard | Dashboard home |
| http://localhost:3000/dashboard/courses | Course list |
| http://localhost:3000/dashboard/analytics | Analytics |
| http://localhost:3000/dashboard/billing | Plans (local demo) |
| http://localhost:3000/dashboard/audit | Audit log (admin) |
| http://localhost:3001/api/docs | Swagger UI |

---

## Optional: real AI quiz generation

Without API keys, quiz generation uses a **built-in mock** (valid JSON, no external calls).

To use real models, add to `apps/api/.env`:

```env
OPENAI_API_KEY=sk-...
# and/or
ANTHROPIC_API_KEY=sk-ant-...
```

Restart the API after changing keys. Quiz generation runs asynchronously via the `ai-generation` BullMQ queue — Redis must be running.

---

## File uploads (videos)

- Uploads are stored under `apps/api/uploads/` (created automatically)
- Served at `http://localhost:3001/uploads/...`
- Processing is a **dev stub** (marks video `READY` after a delay, no ffmpeg)
- Requires Redis for the `video-processing` queue

---

## Troubleshooting

### `ECONNREFUSED` on Redis or Postgres

- Confirm services are running: `docker compose ps`
- Check `DATABASE_URL` host is `localhost` when API runs on host (not `postgres`)
- Check `REDIS_HOST=localhost` for native dev

### API starts but queues / classroom fail

- Redis is almost always the cause — start it: `docker compose up -d redis`
- Check API logs for Redis connection errors on startup

### `PrismaClientInitializationError`

- Postgres not running or wrong `DATABASE_URL`
- Run `npx prisma db push` from `apps/api`

### Port already in use

```bash
# Windows — find process on port 3001
netstat -ano | findstr :3001

# macOS / Linux
lsof -i :3001
```

Stop the conflicting process or change `API_PORT` / Next.js port.

### Web shows API errors / CORS

- Ensure `CORS_ORIGIN=http://localhost:3000` in API `.env`
- Ensure `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1` in web `.env.local`
- Restart both servers after env changes

### `401` on dashboard API calls

- Log in again — access tokens expire (default 15 minutes)
- Refresh flow should run automatically; if not, clear local storage and re-login

### Missing permissions (audit, analytics)

Re-run seed to restore permissions:

```bash
cd apps/api && npx prisma db seed
```

### Windows-specific notes

- Use **two terminals** for `dev:api` and `dev:web` (PowerShell is fine)
- Prefer `copy` instead of `cp` for env files
- Docker Desktop must be running before `docker compose` commands
- If line endings cause script issues in WSL vs PowerShell, run npm commands from one environment consistently

### `npm install` fails

- Use Node 20 or 22: `node -v`
- Delete `node_modules` and `package-lock.json` only as last resort, then `npm install` again

---

## Minimal quick start (copy-paste)

For someone who already has **Node 22** and **Docker Desktop**:

```bash
git clone <your-repo-url> saas && cd saas
npm install
docker compose up -d postgres redis
cp .env.example apps/api/.env          # Windows: copy .env.example apps\api\.env
cp .env.example apps/web/.env.local      # Windows: copy .env.example apps\web\.env.local
cd apps/api && npx prisma db push && npx prisma db seed && cd ../..
npm run dev:api    # terminal 1
npm run dev:web    # terminal 2
```

Open http://localhost:3000/register

---

## What is not needed locally

You do **not** need these for basic local development:

- Stripe account
- Sentry / Prometheus / Grafana
- Nginx
- Production Docker compose (`phase-5.md`)
- ffmpeg (video worker is stubbed)
- Email SMTP (notifications processor is stubbed)

---

## Next steps

- Explore the API: http://localhost:3001/api/docs
- Read feature overview: [`ai_doc.md`](./ai_doc.md) §0
- After manual testing, continue with [`phase-5.md`](./phase-5.md) for production readiness
