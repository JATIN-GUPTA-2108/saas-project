# implementation_plan.md

> **Canonical agent context lives in [`ai_doc.md`](./ai_doc.md).**  
> That file includes §0 Living Project State (what is built, endpoints, schema, next tasks).  
> Update `ai_doc.md` after each phase; keep this file in sync or treat it as a short pointer only.

---

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

---

## Cache & Queue

* Redis
* BullMQ

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
├── app/
├── components/
├── features/
├── services/
├── hooks/
├── stores/
├── lib/
└── types/
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

## Phase 1

* project setup
* Docker
* PostgreSQL
* Redis
* authentication
* RBAC
* organizations

---

## Phase 2

* course management
* uploads
* video pipeline
* queues

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
