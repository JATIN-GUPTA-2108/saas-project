# ai-agent-development-blueprint.md

# AI Agent Development Blueprint — AI-Powered Multi-Tenant LMS SaaS

## Purpose

This document is designed specifically for:

* AI coding agents
* autonomous development assistants
* pair-programming copilots
* architecture-aware code generators

The goal is to provide structured context for building a production-grade multi-tenant AI-powered LMS SaaS platform.

This document should act as:

* architecture memory
* implementation guide
* system design reference
* development workflow specification
* **living record of what is already built** (update after every meaningful change)

---

# 0. Living Project State (keep this section current)

> **AI agents:** After completing a feature, phase, or module, update this section before finishing. Do not let this drift from the codebase.

**Last updated:** 2026-05-20  
**Active phase:** Phase 4 complete → Phase 5 next  
**Product name (UI):** LearnFlow  
**Monorepo root:** `d:\Projects\saas` (npm workspaces)

## 0.1 Repository layout (actual)

```txt
saas/
├── ai_doc.md                 ← canonical agent context (this file)
├── implementation_plan.md    ← mirror of blueprint; prefer editing ai_doc.md
├── docker-compose.yml        ← postgres, redis, api, web
├── package.json              ← workspace root (@lms/*)
├── .env.example
├── apps/
│   ├── api/                  ← @lms/api — NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts       ← RBAC permissions + system roles
│   │   └── src/
│   │       ├── auth/
│   │       ├── organizations/
│   │       ├── rbac/
│   │       ├── prisma/
│   │       ├── courses/
│   │       ├── uploads/
│   │       ├── ai/           ← OpenAI/Anthropic + Zod validation + mock fallback
│   │       ├── quizzes/
│   │       ├── classroom/
│   │       ├── analytics/
│   │       ├── audit/
│   │       ├── billing/
│   │       ├── queue/        ← processors: video, ai, notifications, analytics
│   │       ├── common/       ← filters, guards, redis-io adapter
│   │       └── health/
│   └── web/                  ← @lms/web — Next.js 15 App Router
│       ├── app/              ← /, /login, /register, /dashboard, /dashboard/courses/*
│       ├── components/       ← dashboard-shell, auth-gate, providers
│       ├── features/         ← auth/, courses/, quizzes/, classroom/, analytics/, billing/, audit/
│       ├── services/
│       ├── stores/           ← auth-store, classroom-store
│       ├── lib/              ← api.ts, socket.ts
│       └── types/
```

## 0.2 Phase completion status

| Phase | Status | Notes |
|-------|--------|-------|
| 1 — Setup, auth, RBAC, orgs | **Done** | API + web shell; Prisma v5; builds pass |
| 2 — Courses, uploads, video, queues | **Done** | BullMQ + video worker (dev stub); needs Redis running |
| 3 — AI quizzes, realtime | **Done** | AI worker + Socket.io classroom; mock AI without API keys |
| 4 — Analytics, payments, audit | **Done** | Stripe not wired; local plan changes only |
| 5 — Monitoring, CI/CD, prod | Not started | Docker Compose defined; CI not added |

## 0.3 Implemented backend modules

| Module | Path | Status |
|--------|------|--------|
| Prisma | `apps/api/src/prisma/` | Global `PrismaService` |
| Auth | `apps/api/src/auth/` | JWT access + refresh, bcrypt, register creates org |
| Organizations | `apps/api/src/organizations/` | CRUD, members, invite |
| RBAC | `apps/api/src/rbac/` | System roles, `PermissionsGuard`, `@RequirePermissions()` |
| Health | `apps/api/src/health/` | `GET /api/v1/health` |
| Queue | `apps/api/src/queue/` | BullMQ root + 5 queues; `video-processing` processor live |
| Courses | `apps/api/src/courses/` | CRUD, publish, archive, lessons, progress |
| Uploads | `apps/api/src/uploads/` | Video multipart upload → queue job |
| AI | `apps/api/src/ai/` | OpenAI / Anthropic / mock quiz generation |
| Quizzes | `apps/api/src/quizzes/` | Generate, take, score attempts |
| Classroom | `apps/api/src/classroom/` | Socket.io gateway (`/classroom` namespace) |
| Analytics | `apps/api/src/analytics/` | Event tracking queue + overview API |
| Audit | `apps/api/src/audit/` | Audit log write + admin list API |
| Billing | `apps/api/src/billing/` | Plans, subscription, change-plan scaffold |

**Global middleware / cross-cutting**

* Prefix: `/api/v1`
* Swagger: `/api/docs`
* `TransformInterceptor` → `{ success, data, meta }`
* `HttpExceptionFilter` → `{ success: false, error, ... }`
* Helmet, CORS, `@nestjs/throttler` (100 req/min)
* `ValidationPipe` (whitelist, forbidNonWhitelisted)

## 0.4 Implemented API endpoints

All routes below are under `http://localhost:3001/api/v1` unless noted.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/auth/register` | No | Register user + default workspace (owner role) |
| POST | `/auth/login` | No | Login → access + refresh tokens |
| POST | `/auth/refresh` | No | Body: `{ refreshToken }` |
| POST | `/auth/logout` | No | Body: `{ refreshToken }` — invalidates refresh |
| GET | `/auth/me` | Bearer | Current user profile |
| POST | `/organizations` | Bearer | Create workspace |
| GET | `/organizations` | Bearer | List user's workspaces (includes role) |
| GET | `/organizations/:id` | Bearer | Get workspace (membership required) |
| GET | `/organizations/:id/members` | Bearer | List members |
| POST | `/organizations/:id/members` | Bearer + `member:invite` | Invite by email + role slug |
| GET | `/rbac/permissions` | Bearer + `x-organization-id` | Current user's permissions in org |
| GET | `/courses` | Bearer + org header | List courses (pagination, status, search) |
| POST | `/courses` | Bearer + org + `course:create` | Create course |
| GET | `/courses/:courseId` | Bearer + org | Get course |
| PATCH | `/courses/:courseId` | Bearer + org + `course:update` | Update course |
| POST | `/courses/:courseId/publish` | Bearer + org + `course:publish` | Publish (requires ≥1 lesson) |
| POST | `/courses/:courseId/archive` | Bearer + org + `course:update` | Archive course |
| DELETE | `/courses/:courseId` | Bearer + org + `course:update` | Delete course |
| GET | `/courses/:courseId/lessons` | Bearer + org | List lessons |
| POST | `/courses/:courseId/lessons` | Bearer + org + `course:update` | Create lesson |
| PATCH | `/courses/:courseId/lessons/:lessonId` | Bearer + org + `course:update` | Update lesson |
| DELETE | `/courses/:courseId/lessons/:lessonId` | Bearer + org + `course:update` | Delete lesson |
| POST | `/courses/:courseId/lessons/:lessonId/progress` | Bearer + org | Update learner progress |
| GET | `/courses/:courseId/progress` | Bearer + org | Course completion summary |
| POST | `/uploads/video` | Bearer + org + `course:update` | Multipart video upload (`?lessonId=`) |
| GET | `/uploads/video/:videoId` | Bearer + org | Video asset status |
| POST | `/quizzes/generate` | Bearer + org + `course:update` | AI-generate quiz for lesson |
| GET | `/quizzes/lesson/:lessonId` | Bearer + org | Get quiz (answers hidden for students) |
| GET | `/quizzes/:quizId` | Bearer + org | Get quiz by id |
| POST | `/quizzes/:quizId/attempts` | Bearer + org | Submit answers → scored result |
| GET | `/quizzes/:quizId/attempts/me` | Bearer + org | Latest attempt summary |
| GET | `/analytics/overview` | Bearer + org + `analytics:view` | Dashboard totals (30d) |
| GET | `/analytics/events` | Bearer + org + `analytics:view` | Paginated event stream |
| GET | `/audit/logs` | Bearer + org + `audit:view` | Paginated audit log |
| GET | `/billing/plans` | Bearer + org | List plan tiers |
| GET | `/billing/subscription` | Bearer + org | Current subscription |
| POST | `/billing/subscription/change-plan` | Bearer + org + `billing:manage` | Change plan (local demo) |

**Auto-tracked analytics events** (via `AnalyticsTrackerService`):

* `course.created`, `course.published`, `lesson.completed`, `quiz.attempted`

**WebSocket** (`NEXT_PUBLIC_WS_URL`, namespace `/classroom`):

| Event | Direction | Payload |
|-------|-----------|---------|
| `classroom:join` | client → server | `{ courseId, organizationId }` |
| `classroom:leave` | client → server | `{ courseId, organizationId }` |
| `chat:message` | client → server | `{ courseId, organizationId, message }` |
| `chat:message` | server → clients | `{ userId, email, message, sentAt, ... }` |
| `presence:update` | server → clients | `{ count, userId, action }` |

Auth: JWT in `handshake.auth.token`.

**Tenant context header:** `x-organization-id: <uuid>` — required for org-scoped routes. `OrganizationGuard` validates membership.

## 0.5 Database (Prisma / PostgreSQL)

**Version:** Prisma `5.22.0` (use v5 — v7 changes datasource config)

| Table | Purpose |
|-------|---------|
| `users` | Accounts |
| `refresh_tokens` | Hashed refresh tokens (SHA-256) |
| `organizations` | Workspaces (`slug` unique) |
| `organization_memberships` | User ↔ org ↔ role |
| `roles` | System roles (`organization_id` null) or org-scoped later |
| `permissions` | e.g. `course:create` |
| `role_permissions` | M2M |
| `courses` | Course catalog per org (`DRAFT` / `PUBLISHED` / `ARCHIVED`) |
| `lessons` | Lessons within courses |
| `video_assets` | Uploaded videos + processing status |
| `lesson_progress` | Per-user lesson completion |
| `quizzes` | One quiz per lesson (`GENERATING` / `READY` / `FAILED`) |
| `quiz_questions` | MCQ questions (options JSON, correctIndex) |
| `quiz_attempts` | Scored learner submissions |
| `analytics_events` | Async-ingested engagement events |
| `audit_logs` | Compliance / admin activity trail |
| `subscriptions` | Per-org plan (FREE / STARTER / PRO) |

**Seeded system roles** (`prisma/seed.ts`): `owner`, `admin`, `instructor`, `student`

**Seeded permissions:** `course:create`, `course:update`, `course:publish`, `analytics:view`, `billing:manage`, `organization:manage`, `member:invite`, `member:manage`, `audit:view`

## 0.6 Implemented frontend

| Route | Purpose |
|-------|---------|
| `/` | Marketing landing (LearnFlow) |
| `/login` | Login form → Zustand session |
| `/register` | Register + workspace name |
| `/dashboard` | Workspace switcher + nav shell |
| `/dashboard/courses` | Course list |
| `/dashboard/courses/new` | Create course form |
| `/dashboard/courses/[id]` | Course detail, lessons, video upload, quiz/classroom links |
| `/dashboard/courses/[id]/classroom` | Live chat + presence (Socket.io) |
| `/dashboard/courses/[id]/lessons/[lessonId]/quiz` | AI quiz generate, take, score |
| `/dashboard/analytics` | Overview stats + event stream |
| `/dashboard/billing` | Plans + subscription management |
| `/dashboard/audit` | Audit log table (owner/admin) |

**State rules (enforced):**

* Zustand — `auth-store` (session), `classroom-store` (chat/presence UI only)
* TanStack Query — organizations, courses, lessons, quizzes
* API client — `lib/api.ts` + `apiUpload()` for multipart
* Socket.io — `lib/socket.ts` (classroom); do not duplicate API data in Zustand

## 0.7 Environment variables

See root `.env.example`. Key vars:

| Variable | App | Purpose |
|----------|-----|---------|
| `DATABASE_URL` | api | PostgreSQL connection |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | api | Token signing |
| `API_PORT` | api | Default `3001` |
| `CORS_ORIGIN` | api | Default `http://localhost:3000` |
| `REDIS_HOST` / `REDIS_PORT` | api | BullMQ connection (default localhost:6379) |
| `NEXT_PUBLIC_API_URL` | web | Default `http://localhost:3001/api/v1` |
| `NEXT_PUBLIC_WS_URL` | web | Socket.io server (default `http://localhost:3001`) |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | api | AI quiz gen (optional) |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | api | AI fallback (optional) |

## 0.8 Local development commands

**Full setup guide:** [`LOCAL_SETUP.md`](./LOCAL_SETUP.md) — prerequisites, env files, Docker, troubleshooting.

```bash
# Install (from repo root)
npm install

# Database (requires Postgres on localhost:5432)
cd apps/api
npx prisma db push
npx prisma db seed

# Redis (required for video processing queue)
docker run -d -p 6379:6379 redis:7-alpine
# or: docker compose up -d redis

# Run API
npm run dev:api          # or: cd apps/api && npm run dev

# Run web
npm run dev:web          # or: cd apps/web && npm run dev
```

**Docker Compose** (postgres + redis + api + web): `docker compose up -d` — requires Docker Desktop.

**Video processing note:** Worker is a dev stub (marks READY after delay). Production needs ffmpeg HLS + thumbnail pipeline.

## 0.9 Not implemented yet (do not assume these exist)

* Real ffmpeg HLS transcoding (video worker stub only)
* Stripe payment integration (billing is local demo only)
* Email queue processor
* Classroom polls, reactions (chat + presence only)
* Push/email notification delivery
* GitHub Actions CI
* Email verification / password reset / OAuth
* Nginx in compose
* Prometheus / Grafana / Sentry

## 0.10 Next tasks (Phase 5 — pick up here)

**Full implementation guide:** [`phase-5.md`](./phase-5.md) — read after Phase 4 testing passes.

Summary order:

1. Testing foundation + GitHub Actions CI (lint, test, build, docker)
2. Production Docker compose hardening + entrypoint migrations
3. Deep health checks + graceful shutdown
4. Prometheus metrics + Grafana dashboards
5. Sentry (API + web)
6. Stripe Checkout, portal, webhooks
7. Nginx reverse proxy in prod compose
8. Update `ai_doc.md` §0 when each stream ships

---

# 1. Project Overview

## Product Description

Build a production-grade multi-tenant LMS SaaS platform with:

* organizations/workspaces
* AI quiz generation
* realtime classrooms
* video processing pipeline
* analytics
* RBAC authorization
* audit logs
* subscriptions/payments
* websocket notifications
* scalable backend infrastructure

---

# 2. Core Technical Goals

The project must demonstrate:

* senior-level backend engineering
* scalable architecture
* SaaS multi-tenancy
* distributed job processing
* realtime communication
* event-driven systems
* AI integration
* cloud-native infrastructure
* production readiness

---

# 3. Primary Tech Stack

## Frontend

* Next.js
* TypeScript
* TailwindCSS
* Zustand
* TanStack Query
* Socket.io Client

---

## Backend

* NestJS
* TypeScript
* REST API
* WebSockets
* Swagger/OpenAPI

---

## Database

* PostgreSQL
* **ORM:** Prisma 5.x (`apps/api/prisma/`)

---

## Cache & Queue

* Redis (Docker Compose service defined; **not wired in NestJS yet**)
* BullMQ (planned Phase 2)

---

## Infrastructure

* Docker
* Docker Compose
* GitHub Actions
* Nginx

---

## AI

* OpenAI API
* Anthropic API

---

# 4. System Architecture

```txt
Next.js Frontend
        |
        v
NestJS API Gateway
        |
        +----------------------+
        |                      |
        v                      v
PostgreSQL                 Redis
        |                      |
        |                  BullMQ
        |                      |
        v                      v
Business Data         Background Workers
                             |
                             +--> AI Quiz Generation
                             +--> Video Processing
                             +--> Notifications
                             +--> Analytics Aggregation
```

---

# 5. Development Philosophy

## Architecture Style

Use:

* Modular Monolith initially
* Domain-oriented modules
* Clean architecture principles
* Event-driven async processing

Avoid:

* premature microservices
* overengineering
* tightly coupled modules

---

# 6. Multi-Tenancy Strategy

## Recommended Approach

Shared PostgreSQL database.

All tenant-aware tables must contain:

```sql
organization_id
```

Example:

```sql
courses
users
analytics_events
quiz_attempts
subscriptions
```

---

## Tenant Isolation Rules

Every API endpoint must:

* validate organization membership
* filter by organization_id
* enforce RBAC

Never expose cross-tenant data.

---

# 7. Required Backend Modules

## Authentication Module

Responsibilities:

* JWT auth
* refresh tokens
* OAuth
* session management
* email verification
* password reset

---

## Organization Module

Responsibilities:

* organization CRUD
* workspace settings
* tenant membership
* invitations

---

## RBAC Module

Responsibilities:

* roles
* permissions
* authorization guards
* policy checks

Example permissions:

```txt
course:create
course:update
course:publish
analytics:view
billing:manage
```

---

## Course Module

Responsibilities:

* course CRUD
* lesson management
* publishing workflow
* progress tracking
* categories/tags

---

## Video Module

Responsibilities:

* uploads
* transcoding jobs
* HLS generation
* thumbnail generation
* subtitle handling

---

## Quiz Module

Responsibilities:

* AI quiz generation
* quiz attempts
* scoring
* grading
* analytics

---

## Analytics Module

Responsibilities:

* event ingestion
* aggregations
* dashboards
* completion tracking
* engagement analysis

---

## Notification Module

Responsibilities:

* websocket notifications
* email notifications
* reminders
* retry handling

---

## Audit Module

Responsibilities:

* audit logs
* actor tracking
* compliance events
* admin visibility

---

# 8. Frontend Architecture

## App Structure

```txt
apps/web/
├── app/              ← App Router pages (implemented: /, /login, /register, /dashboard)
├── components/       ← providers.tsx (TanStack Query)
├── features/         ← feature UI (auth forms live)
├── services/         ← API calls (auth, organizations)
├── hooks/            ← (add per feature as needed)
├── stores/           ← auth-store.ts (Zustand + persist)
├── lib/              ← api.ts client
└── types/            ← auth.ts
```

---

## State Management Rules

### Zustand

Use for:

* auth state
* UI state
* websocket state
* classroom state
* video player state

### TanStack Query

Use for:

* API caching
* server state
* mutations
* pagination
* infinite queries

Do NOT duplicate API data inside Zustand.

---

# 9. Queue Architecture

## BullMQ Queues

Required queues:

```txt
video-processing.queue
ai-generation.queue
notifications.queue
analytics.queue
emails.queue
```

---

## Queue Design Rules

All jobs must support:

* retries
* exponential backoff
* idempotency
* dead-letter handling
* structured logging

---

# 10. AI Integration Rules

## AI Quiz Generation Flow

```txt
Lesson Content
      |
Chunking
      |
Prompt Generation
      |
LLM API
      |
Structured JSON Output
      |
Validation
      |
Persistence
```

---

## AI Constraints

All AI outputs must:

* validate JSON schema
* handle malformed responses
* include retry logic
* support rate limiting

Never trust raw AI output directly.

---

# 11. Realtime System Design

## WebSocket Stack

* Socket.io
* Redis Adapter

---

## Realtime Features

Required:

* classroom chat
* presence tracking
* reactions
* notifications
* polls

---

## Socket Event Naming Convention

```txt
classroom:join
classroom:leave
chat:message
presence:update
notification:new
```

---

# 12. Video Processing Pipeline

## Upload Flow

```txt
Upload Video
      |
Store Raw File
      |
Create Queue Job
      |
Worker Transcoding
      |
Generate HLS Streams
      |
Generate Thumbnail
      |
Store Metadata
```

---

## Video Requirements

Support:

* resumable uploads
* HLS streaming
* signed URLs
* subtitle support
* thumbnail generation

---

# 13. Database Design Guidelines

## Naming Conventions

### Tables

snake_case plural.

Example:

```txt
quiz_attempts
analytics_events
organization_memberships
```

---

## Columns

snake_case.

---

## Required Base Columns

Every table should include:

```sql
id
created_at
updated_at
organization_id
```

when applicable.

---

# 14. API Design Standards

## REST Standards

Use:

```txt
/api/v1/
```

---

## API Requirements

Every endpoint should support:

* validation
* pagination
* filtering
* sorting
* authorization
* rate limiting

---

## Response Format

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

---

# 15. Error Handling Standards

## Backend

Use:

* global exception filters
* structured error responses
* centralized logging

---

## Logging

Every log should include:

```txt
requestId
organizationId
userId
module
severity
```

---

# 16. Security Standards

## Required Security Features

* Helmet
* Rate limiting
* Input validation
* RBAC guards
* JWT rotation
* Secure cookies
* XSS protection
* CSRF protection
* File validation

---

## Never Allow

* direct SQL interpolation
* unsafe file uploads
* tenant data leaks
* unrestricted websocket access

---

# 17. Infrastructure Requirements

## Docker Services

Required:

```txt
frontend
backend
postgres
redis
workers
nginx
```

---

## Environment Variables

Must support:

* local
* development
* staging
* production

---

# 18. CI/CD Requirements

## GitHub Actions Pipeline

Required steps:

```txt
lint
unit tests
build
docker build
deployment
```

---

# 19. Monitoring & Observability

## Monitoring Stack

* Prometheus
* Grafana
* Sentry

---

## Required Metrics

Track:

* API latency
* queue failures
* websocket connections
* video processing duration
* AI request duration
* DB query time

---

# 20. Coding Standards

## Backend Standards

* strict TypeScript
* DTO validation
* repository/service separation
* dependency injection
* modular architecture

---

## Frontend Standards

* feature-based structure
* reusable components
* server components where beneficial
* avoid prop drilling

---

# 21. Git Workflow

## Branch Strategy

```txt
main
develop
feature/*
fix/*
```

---

## Commit Convention

Use:

```txt
feat:
fix:
refactor:
perf:
chore:
```

---

# 22. Recommended Development Order

## Phase 1 — COMPLETE

* [x] project setup (npm workspaces, `apps/api`, `apps/web`)
* [x] Docker Compose file (postgres, redis, api, web)
* [x] PostgreSQL + Prisma schema
* [x] authentication (JWT + refresh)
* [x] RBAC (permissions, guards, seed)
* [x] organizations (CRUD, members, invite)
* [x] frontend auth flow + dashboard shell

---

## Phase 2 — COMPLETE

* [x] Redis + BullMQ (`@nestjs/bullmq`, 5 queues registered)
* [x] course management (CRUD, publish, archive, pagination)
* [x] lessons (CRUD, sort order, progress tracking)
* [x] uploads (multipart video, local `uploads/` storage)
* [x] video pipeline worker (dev stub → READY status)
* [x] frontend courses UI (list, create, detail, lesson + video upload)

---

## Phase 3 — COMPLETE

* [x] Quiz Prisma schema + API (generate, take, score)
* [x] AI service (OpenAI, Anthropic, mock fallback, Zod validation)
* [x] `ai-generation` BullMQ processor
* [x] Socket.io classroom gateway + Redis adapter
* [x] Classroom chat + presence events
* [x] Notifications queue processor (stub)
* [x] Frontend quiz UI + classroom view + socket store

---

## Phase 4 — COMPLETE

* [x] `analytics_events` table + BullMQ ingestion processor
* [x] Analytics overview + events API (`analytics:view`)
* [x] Auto-tracking on course/quiz/lesson actions
* [x] `audit_logs` table + list API (`audit:view`)
* [x] Audit on org create, member invite, course publish, plan change
* [x] `subscriptions` table + plans API (FREE/STARTER/PRO)
* [x] Billing change-plan scaffold (no Stripe yet)
* [x] Frontend: analytics dashboard, billing, audit log pages

---

## Phase 5 — NEXT

See **[`phase-5.md`](./phase-5.md)** for the full implementation plan.

* CI/CD (GitHub Actions)
* Production Docker + nginx
* Monitoring (Prometheus, Grafana, Sentry)
* Stripe billing integration
* Health checks & graceful shutdown

---

# 23. AI Agent Operating Instructions

## Keep this document updated

When you ship work, update **§0 Living Project State** in this file:

1. Bump **Last updated** date.
2. Mark phase / module status tables.
3. Add new API routes, tables, env vars, and file paths.
4. Move items from §0.9 (not implemented) to §0.3–0.6 as appropriate.
5. Refresh §0.10 next tasks.

`implementation_plan.md` is a legacy duplicate; **`ai_doc.md` is the single source of truth.**

## Priority Order

When implementing features:

1. correctness
2. security
3. scalability
4. maintainability
5. performance

---

## Code Generation Rules

Always:

* use TypeScript strict mode
* prefer modular reusable code
* avoid duplication
* include validation
* include error handling
* include typing
* write production-ready code

---

## Avoid

* massive files
* business logic in controllers
* tightly coupled modules
* hardcoded secrets
* unvalidated inputs
* direct DB access in controllers

---

# 24. Future Scalability

System should eventually support:

* horizontal scaling
* distributed workers
* microservice extraction
* websocket clustering
* AI service isolation
* analytics pipeline scaling

---

# 25. Final Project Objective

The final project should look like:

* a real SaaS startup
* enterprise-grade infrastructure
* scalable production system
* senior-level engineering portfolio project

The system should be impressive both:

* technically
* visually
* architecturally
* operationally

---

# 26. Implementation changelog

| Date | Change | Agent note |
|------|--------|------------|
| 2026-05-20 | Phase 1 scaffold: monorepo, NestJS auth/org/RBAC, Next.js shell, Prisma schema + seed, Docker Compose | Initial baseline |
| 2026-05-20 | Phase 2: courses, lessons, uploads, BullMQ video-processing worker, dashboard courses UI | Video worker is dev stub; Redis required at runtime |
| 2026-05-20 | Phase 3: AI quizzes, ai-generation worker, Socket.io classroom, quiz/classroom UI | Mock AI without API keys; notifications processor stub |
| 2026-05-20 | Phase 4: analytics events, audit logs, billing scaffold, dashboard pages | Stripe not integrated; run `prisma db push` + `prisma db seed` for audit:view perm |
| 2026-06-07 | Added `phase-5.md` — production readiness plan (CI, Docker, monitoring, Stripe, nginx) | Start after Phase 4 manual testing |
| 2026-06-07 | Added `LOCAL_SETUP.md` — local dev prerequisites and run guide | Linked from §0.8 |
