# Phase 5 — Production Readiness (LearnFlow)

> **Status:** Not started — begin after Phase 4 manual testing passes.  
> **Canonical project state:** [`ai_doc.md`](./ai_doc.md) §0  
> **Last updated:** 2026-06-07

---

## Purpose

Phase 5 turns the LearnFlow monorepo from a feature-complete dev stack into something deployable, observable, and billable in production. It does **not** add major product features; it adds operational infrastructure.

When this phase is done:

- Every push to `main` runs lint, test, and build in CI
- Docker images are production-safe (no dev bind mounts, secrets from env)
- API exposes Prometheus metrics; Grafana dashboards exist locally
- Errors surface in Sentry (API + web)
- Stripe handles real subscriptions; local `change-plan` becomes checkout + webhooks
- Nginx terminates TLS and routes traffic in compose
- `ai_doc.md` §0 reflects all of the above

---

## Prerequisites (complete before starting Phase 5)

Run through this checklist while testing Phases 1–4 locally:

| Area | Verify |
|------|--------|
| Auth | Register, login, refresh token, logout |
| Orgs | Create org, invite member, switch org header |
| RBAC | Owner vs member permissions on courses/billing/audit |
| Courses | CRUD, publish, lessons, video upload (stub worker → READY) |
| Quizzes | Generate (mock AI without keys), take, score |
| Classroom | Join room, chat, presence (Redis + Socket.io) |
| Analytics | Events appear after course/quiz actions |
| Audit | Logs visible to admin (`audit:view`) |
| Billing | Plan cards load; local plan change works |
| Infra | Postgres + Redis running; `npm run build` passes at root |

**Known gaps (acceptable for Phase 4, addressed in Phase 5):**

- No unit/e2e tests in repo yet (`*.spec.ts` absent)
- Video worker is a dev stub (ffmpeg not wired)
- Email/notifications processor is a stub
- Compose mounts source into API container (dev-only)
- Health check does not probe DB/Redis
- JWT secrets in compose are placeholders

---

## Current baseline (what already exists)

| Asset | Location | Notes |
|-------|----------|-------|
| Monorepo scripts | `package.json` | `build`, `lint`, `dev:api`, `dev:web` |
| API Dockerfile | `apps/api/Dockerfile` | Multi-stage; production CMD `node dist/main.js` |
| Web Dockerfile | `apps/web/Dockerfile` | Multi-stage Next.js production image |
| Compose (dev) | `docker-compose.yml` | postgres, redis, api, web — **no nginx/workers split** |
| Health endpoint | `GET /api/v1/health` | Returns `{ status: 'ok' }` only |
| Billing scaffold | `apps/api/src/billing/` | Local plan change; `stripeCustomerId` / `stripeSubscriptionId` columns exist but unused |
| Queue names | `apps/api/src/queue/queue.constants.ts` | `video-processing`, `ai-generation`, `notifications`, `analytics`, `emails` |
| Env template | `.env.example` | No Stripe, Sentry, or metrics vars yet |

---

## Recommended workstreams & order

Implement in this order — each stream builds on the previous:

```txt
5.1  Testing foundation + CI pipeline
5.2  Production Docker & compose hardening
5.3  Health checks & graceful shutdown
5.4  Prometheus metrics + Grafana
5.5  Sentry error tracking
5.6  Stripe billing integration
5.7  Nginx reverse proxy
5.8  Optional: ffmpeg video pipeline (can defer post-launch)
```

---

## 5.1 Testing foundation + GitHub Actions CI

### Goal

CI blocks broken merges. Minimal but real tests exist so the pipeline is meaningful.

### Tasks

1. **Add smoke unit tests (API)**
   - `apps/api/src/health/health.controller.spec.ts` — controller returns ok
   - `apps/api/src/auth/auth.service.spec.ts` — hash/compare password helpers (mock Prisma)
   - Target: ≥3 spec files, CI runs `npm run test --workspace=@lms/api`

2. **Add API e2e smoke test**
   - Extend `apps/api/test/` — `GET /api/v1/health` with test app bootstrap
   - Use in-memory or test DB strategy (document choice in test README)

3. **Root CI workflow**
   - Create `.github/workflows/ci.yml`:

```yaml
# Suggested structure (fill in versions/paths)
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: lms
          POSTGRES_PASSWORD: lms_secret
          POSTGRES_DB: lms_test
        ports: ['5432:5432']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run build
        env:
          DATABASE_URL: postgresql://lms:lms_secret@localhost:5432/lms_test?schema=public
          JWT_ACCESS_SECRET: ci-access-secret-minimum-32-characters
          JWT_REFRESH_SECRET: ci-refresh-secret-minimum-32-characters
      - run: npm run test --workspace=@lms/api

  docker-build:
    runs-on: ubuntu-latest
    needs: lint-and-test
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t lms-api ./apps/api
      - run: docker build -t lms-web ./apps/web
```

4. **Optional:** Dependabot config (`.github/dependabot.yml`) for npm

### Acceptance criteria

- [ ] PR to `main` runs lint + build + test automatically
- [ ] Docker build job succeeds for both apps
- [ ] Failing test fails the workflow

### Files to create/modify

```txt
.github/workflows/ci.yml
apps/api/src/**/*.spec.ts
apps/api/test/app.e2e-spec.ts (or extend existing)
```

---

## 5.2 Production Docker & compose hardening

### Goal

Separate dev and prod compose; production images run migrations on start; no source bind mounts.

### Tasks

1. **Split compose files**
   - `docker-compose.yml` — keep as local dev (bind mounts OK)
   - `docker-compose.prod.yml` — production overrides:
     - Remove `volumes` bind mounts on api/web
     - Set `NODE_ENV=production`
     - Use built images only (`build:` with `target: production`)
     - Secrets via `.env` file (never commit)

2. **API startup script**
   - Add `apps/api/docker-entrypoint.sh`:
     - `npx prisma migrate deploy` (or `db push` for demo — prefer migrations for prod)
     - `node dist/main.js`
   - Update API Dockerfile `CMD` to use entrypoint

3. **Web public env at build time**
   - Document that `NEXT_PUBLIC_*` vars must be passed as `ARG` at docker build for prod
   - Example in `apps/web/Dockerfile`:

```dockerfile
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
```

4. **Worker process split (recommended)**
   - Option A: Same API container runs Nest + BullMQ processors (current behavior)
   - Option B: Separate `worker` service in compose sharing API image with `WORKER_MODE=true`
   - Document chosen approach in `ai_doc.md`

5. **Add `.dockerignore`** for both apps (exclude `node_modules`, `dist`, `.env`, `uploads`)

### Acceptance criteria

- [ ] `docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build` starts full stack
- [ ] API connects to postgres/redis without host bind mounts
- [ ] Fresh DB gets schema via migrate on container start

### Files to create/modify

```txt
docker-compose.prod.yml
apps/api/docker-entrypoint.sh
apps/api/.dockerignore
apps/web/.dockerignore
apps/api/Dockerfile
apps/web/Dockerfile
```

---

## 5.3 Health checks & graceful shutdown

### Goal

Orchestrators and load balancers can detect unhealthy instances; in-flight requests drain cleanly.

### Tasks

1. **Deep health check**
   - Extend `HealthController` or add `HealthService`:
     - Ping Prisma (`SELECT 1`)
     - Ping Redis (BullMQ connection or ioredis)
     - Return `{ status, db, redis, uptime }`
   - Keep `GET /health` fast; optional `GET /health/ready` for k8s readiness

2. **Graceful shutdown**
   - In `main.ts`: enable Nest shutdown hooks
   - Close BullMQ workers, Redis adapter, Prisma on `SIGTERM`

3. **Compose healthchecks**
   - Add `healthcheck` to `api` and `web` services in prod compose

### Acceptance criteria

- [ ] Stopping postgres makes `/health/ready` return non-200
- [ ] `docker compose stop api` completes without killing mid-request (manual smoke)

### Files to modify

```txt
apps/api/src/health/
apps/api/src/main.ts
docker-compose.prod.yml
```

---

## 5.4 Prometheus metrics + Grafana

### Goal

Expose standard HTTP and custom business metrics; visualize locally with Grafana.

### Tasks

1. **Install metrics**
   - Add `@willsoto/nestjs-prometheus` + `prom-client` (or `@nestjs/terminus` + custom registry)
   - Expose `GET /api/v1/metrics` (protect in prod or restrict by network)

2. **Default metrics**
   - HTTP request duration histogram (method, route, status)
   - Active websocket connections gauge

3. **Custom metrics** (from blueprint §19)

| Metric | Type | Labels |
|--------|------|--------|
| `lms_queue_job_duration_seconds` | Histogram | queue, status |
| `lms_queue_jobs_failed_total` | Counter | queue |
| `lms_ai_request_duration_seconds` | Histogram | provider |
| `lms_video_processing_duration_seconds` | Histogram | status |
| `lms_db_query_duration_seconds` | Histogram | operation |

   - Instrument processors in `apps/api/src/queue/processors/`
   - Instrument `AiService` calls

4. **Local monitoring stack**
   - `docker-compose.monitoring.yml`:
     - Prometheus (scrape api:3001/metrics)
     - Grafana (provision dashboard JSON)

5. **Grafana dashboard**
   - Panels: request rate, p95 latency, queue failures, WS connections
   - Store JSON in `infra/grafana/dashboards/lms-overview.json`

### Acceptance criteria

- [ ] `curl localhost:3001/api/v1/metrics` returns Prometheus text format
- [ ] Grafana dashboard loads and shows live data after traffic

### Files to create/modify

```txt
apps/api/src/metrics/          (new module)
apps/api/src/app.module.ts
apps/api/src/queue/processors/*.ts
apps/api/src/ai/ai.service.ts
infra/prometheus/prometheus.yml
infra/grafana/
docker-compose.monitoring.yml
.env.example                     (METRICS_ENABLED, etc.)
```

---

## 5.5 Sentry error tracking

### Goal

Uncaught API exceptions and client-side errors appear in Sentry with release/environment tags.

### Tasks

1. **API**
   - Add `@sentry/nestjs` + `@sentry/node`
   - Init in `main.ts` before app creation (DSN from env)
   - Global exception filter integration or Sentry interceptor
   - Strip sensitive fields (passwords, tokens) from breadcrumbs

2. **Web**
   - Add `@sentry/nextjs`
   - `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
   - Wire `next.config.ts` with `withSentryConfig` (optional source maps upload)

3. **Env vars**

```env
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_DSN=
```

### Acceptance criteria

- [ ] Throwing test error in API appears in Sentry project
- [ ] Client error boundary reports to Sentry in browser

### Files to create/modify

```txt
apps/api/src/main.ts
apps/api/src/common/filters/ (optional Sentry filter)
apps/web/sentry.*.config.ts
apps/web/next.config.ts
.env.example
```

---

## 5.6 Stripe billing integration

### Goal

Replace local-only plan changes with Stripe Checkout + Customer Portal + webhooks. Keep FREE tier without Stripe.

### Current schema (already ready)

```prisma
model Subscription {
  stripeCustomerId     String?
  stripeSubscriptionId String?
  plan                 PlanTier
  status               SubscriptionStatus
  ...
}
```

### Tasks

1. **Install & config**
   - `stripe` npm package in API
   - Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`

2. **Stripe service** — `apps/api/src/billing/stripe.service.ts`
   - `createCustomer(orgId, email)`
   - `createCheckoutSession(orgId, priceId, successUrl, cancelUrl)`
   - `createPortalSession(customerId, returnUrl)`
   - `handleWebhookEvent(payload, signature)`

3. **New endpoints**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/billing/checkout` | JWT + `billing:manage` | Returns Stripe Checkout URL |
| POST | `/billing/portal` | JWT + `billing:manage` | Returns Customer Portal URL |
| POST | `/billing/webhooks/stripe` | Stripe signature | No JWT — raw body |

4. **Webhook handlers**
   - `checkout.session.completed` → set plan, store stripe IDs
   - `customer.subscription.updated` → sync status/plan
   - `customer.subscription.deleted` → downgrade to FREE
   - Log all webhook events to audit (`billing.stripe_webhook`)

5. **Update `changePlan`**
   - Deprecate direct DB plan change for paid tiers
   - FREE downgrade can remain local or via portal cancel

6. **Frontend** — `apps/web/features/billing/billing-panel.tsx`
   - "Upgrade" → call checkout API → redirect to Stripe
   - "Manage subscription" → portal link when `stripeConnected`

7. **Local testing**
   - Stripe CLI: `stripe listen --forward-to localhost:3001/api/v1/billing/webhooks/stripe`

### Acceptance criteria

- [ ] Upgrade Starter via Checkout updates DB + audit log
- [ ] Webhook signature verification rejects invalid payloads
- [ ] Portal allows cancel → subscription status synced

### Files to create/modify

```txt
apps/api/src/billing/stripe.service.ts
apps/api/src/billing/billing.controller.ts
apps/api/src/billing/billing.service.ts
apps/api/src/billing/billing.module.ts
apps/api/src/main.ts              (raw body for webhook route)
apps/web/features/billing/
apps/web/services/billing.service.ts
.env.example
```

---

## 5.7 Nginx reverse proxy

### Goal

Single entry point on `:80`/`:443`; route `/api` → API, `/` → web, `/socket.io` → API with WS upgrade.

### Tasks

1. **Nginx config** — `infra/nginx/nginx.conf`

```nginx
upstream api { server api:3001; }
upstream web { server web:3000; }

server {
  listen 80;

  location /api/ {
    proxy_pass http://api;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location /socket.io/ {
    proxy_pass http://api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  location / {
    proxy_pass http://web;
  }
}
```

2. **Add nginx service** to `docker-compose.prod.yml`
3. **Update CORS / public URLs** — web uses relative `/api/v1` or nginx host
4. **TLS (optional for local prod demo)**
   - mkcert or Let's Encrypt notes in doc
   - `infra/nginx/ssl/` gitignored

### Acceptance criteria

- [ ] `http://localhost/` serves Next.js through nginx
- [ ] `http://localhost/api/v1/health` proxied correctly
- [ ] Classroom websocket works through nginx

### Files to create/modify

```txt
infra/nginx/nginx.conf
docker-compose.prod.yml
.env.example
apps/web/lib/api.ts               (if base URL changes)
apps/web/lib/socket.ts
```

---

## 5.8 Optional — ffmpeg video pipeline

Defer if Phase 5 scope is tight. Document as Phase 5b or post-launch.

### Tasks

- Install ffmpeg in API/worker Docker image
- Replace stub in `video-processing.processor.ts` with HLS transcode + thumbnail
- Store outputs in `uploads/` or S3-compatible storage (add `STORAGE_*` env vars)
- Serve HLS via static or signed URLs

---

## Environment variables (Phase 5 additions)

Add to `.env.example` when implementing:

```env
# --- Phase 5: Monitoring ---
METRICS_ENABLED=true
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1

# --- Phase 5: Stripe ---
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# --- Phase 5: Web (Sentry) ---
NEXT_PUBLIC_SENTRY_DSN=

# --- Phase 5: Production URLs (docker build args) ---
NEXT_PUBLIC_API_URL=http://localhost/api/v1
NEXT_PUBLIC_WS_URL=http://localhost
```

---

## Phase 5 completion checklist

Mark Phase 5 complete when all required items pass:

### CI/CD
- [ ] `.github/workflows/ci.yml` green on `main`
- [ ] Docker build job passes

### Production Docker
- [ ] `docker-compose.prod.yml` runs without dev bind mounts
- [ ] DB migrations run on API startup

### Observability
- [ ] `/api/v1/metrics` exposed
- [ ] Grafana dashboard provisioned
- [ ] Sentry receiving API + web errors

### Billing
- [ ] Stripe Checkout + webhooks wired
- [ ] Frontend upgrade/manage flows work with test mode keys

### Proxy
- [ ] Nginx routes HTTP + WebSocket correctly

### Documentation
- [ ] `ai_doc.md` §0 updated (phase table, env vars, endpoints, changelog)
- [ ] §0.9 items moved out as implemented
- [ ] §0.10 replaced with post-Phase-5 backlog (ffmpeg, email, OAuth, etc.)

---

## Post-Phase 5 backlog (not in scope)

These remain from `ai_doc.md` §0.9 — tackle after Phase 5 or in parallel if needed:

| Item | Notes |
|------|-------|
| ffmpeg HLS transcoding | Real video pipeline |
| Email processor | Wire `EMAILS` queue + SMTP/Resend |
| Email verification / password reset | Auth hardening |
| OAuth (Google/GitHub) | Passport strategies |
| Classroom polls & reactions | Product feature |
| Kubernetes / cloud deploy | AWS/GCP/Fly.io manifests |
| Rate limit tuning per plan tier | Billing enforcement |

---

## Agent handoff notes

When picking up Phase 5:

1. Read `ai_doc.md` §0 first — confirm Phase 4 still matches codebase after your testing.
2. Work one workstream at a time (5.1 → 5.7); commit logically per stream if committing.
3. After each workstream, update `ai_doc.md` §0.3–0.7 and changelog §26.
4. Do **not** commit secrets, `.env`, or Stripe test keys.
5. Prefer `prisma migrate dev` for schema changes going forward (CI uses `migrate deploy`).

**Suggested first PR:** 5.1 CI only — smallest vertical slice, unblocks everything else.

---

## Quick reference — key paths

```txt
saas/
├── phase-5.md                    ← this document
├── ai_doc.md                     ← living state (update after each stream)
├── docker-compose.yml            ← dev
├── docker-compose.prod.yml       ← create in 5.2
├── docker-compose.monitoring.yml ← create in 5.4
├── .github/workflows/ci.yml      ← create in 5.1
├── infra/
│   ├── nginx/nginx.conf          ← create in 5.7
│   ├── prometheus/prometheus.yml
│   └── grafana/dashboards/
└── apps/
    ├── api/src/
    │   ├── health/
    │   ├── metrics/              ← create in 5.4
    │   └── billing/stripe.service.ts  ← create in 5.6
    └── web/
        └── sentry.*.config.ts    ← create in 5.5
```
