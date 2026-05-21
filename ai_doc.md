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
**Active phase:** Phase 1 complete → Phase 2 next  
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
│   │       ├── common/       ← filters, interceptors, decorators, utils
│   │       └── health/
│   └── web/                  ← @lms/web — Next.js 15 App Router
│       ├── app/              ← routes: /, /login, /register, /dashboard
│       ├── components/
│       ├── features/auth/
│       ├── services/
│       ├── stores/           ← Zustand (auth only)
│       ├── lib/api.ts
│       └── types/
```

## 0.2 Phase completion status

| Phase | Status | Notes |
|-------|--------|-------|
| 1 — Setup, auth, RBAC, orgs | **Done** | API + web shell; Prisma v5; builds pass |
| 2 — Courses, uploads, video, queues | Not started | BullMQ workers not wired yet |
| 3 — AI quizzes, realtime | Not started | |
| 4 — Analytics, payments, audit | Not started | |
| 5 — Monitoring, CI/CD, prod | Not started | Docker Compose defined; CI not added |

## 0.3 Implemented backend modules

| Module | Path | Status |
|--------|------|--------|
| Prisma | `apps/api/src/prisma/` | Global `PrismaService` |
| Auth | `apps/api/src/auth/` | JWT access + refresh, bcrypt, register creates org |
| Organizations | `apps/api/src/organizations/` | CRUD, members, invite |
| RBAC | `apps/api/src/rbac/` | System roles, `PermissionsGuard`, `@RequirePermissions()` |
| Health | `apps/api/src/health/` | `GET /api/v1/health` |

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

**Tenant context header:** `x-organization-id: <uuid>` — required for permission-gated routes and `/rbac/permissions`.

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

**Seeded system roles** (`prisma/seed.ts`): `owner`, `admin`, `instructor`, `student`

**Seeded permissions:** `course:create`, `course:update`, `course:publish`, `analytics:view`, `billing:manage`, `organization:manage`, `member:invite`, `member:manage`

## 0.6 Implemented frontend

| Route | Purpose |
|-------|---------|
| `/` | Marketing landing (LearnFlow) |
| `/login` | Login form → Zustand session |
| `/register` | Register + workspace name |
| `/dashboard` | Workspace list, active org switcher |

**State rules (enforced):**

* Zustand (`stores/auth-store.ts`) — auth tokens, user, active organization only
* TanStack Query — `organizations` list from API
* API client — `lib/api.ts` unwraps `{ success, data }`

## 0.7 Environment variables

See root `.env.example`. Key vars:

| Variable | App | Purpose |
|----------|-----|---------|
| `DATABASE_URL` | api | PostgreSQL connection |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | api | Token signing |
| `API_PORT` | api | Default `3001` |
| `CORS_ORIGIN` | api | Default `http://localhost:3000` |
| `REDIS_HOST` / `REDIS_PORT` | api | Reserved for Phase 2 queues |
| `NEXT_PUBLIC_API_URL` | web | Default `http://localhost:3001/api/v1` |

## 0.8 Local development commands

```bash
# Install (from repo root)
npm install

# Database (requires Postgres on localhost:5432)
cd apps/api
npx prisma db push
npx prisma db seed

# Run API
npm run dev:api          # or: cd apps/api && npm run dev

# Run web
npm run dev:web          # or: cd apps/web && npm run dev
```

**Docker Compose** (postgres + redis + api + web): `docker compose up -d` — requires Docker Desktop.

## 0.9 Not implemented yet (do not assume these exist)

* BullMQ queues and workers
* Redis integration in NestJS
* Course / lesson / video / quiz modules
* Socket.io / realtime
* OpenAI / Anthropic integration
* File uploads, HLS, transcoding
* Analytics events, audit logs, billing
* GitHub Actions CI
* Email verification / password reset / OAuth

## 0.10 Next tasks (Phase 2 — pick up here)

1. Add `courses` module (CRUD, `organization_id` on all queries)
2. Wire `@nestjs/bullmq` + Redis; create queue scaffolding per §9
3. Lesson entities + publishing workflow
4. Upload module (presigned or local storage for dev)
5. Extend `ai_doc.md` §0 when each item ships

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
* [ ] Redis used in app code (container only; Phase 2)
* [x] authentication (JWT + refresh)
* [x] RBAC (permissions, guards, seed)
* [x] organizations (CRUD, members, invite)
* [x] frontend auth flow + dashboard shell

---

## Phase 2 — NEXT

* course management
* uploads
* video pipeline
* queues (BullMQ + Redis)

---

## Phase 3

* AI quiz generation
* realtime classroom
* websocket notifications

---

## Phase 4

* analytics
* payments
* audit logs
* integrations

---

## Phase 5

* monitoring
* optimization
* CI/CD
* production deployment

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
| 2026-05-20 | Phase 1 scaffold: monorepo, NestJS auth/org/RBAC, Next.js shell, Prisma schema + seed, Docker Compose | Initial baseline; Redis/BullMQ deferred to Phase 2 |
