# RPOS Studio Architecture

## Overview

RPOS Studio is a modular Next.js application with a separate background worker.

```text
Browser / Next.js UI
        ↓
Route Handlers
        ↓
MySQL queue and application data
        ↓
Standalone production worker
        ↓
OpenAI + WordPress
```

## Main layers

- `src/app`: Next.js pages and API routes
- `src/components`: reusable app components
- `src/components/ui`: shared UI primitives
- `src/modules`: feature modules
- `src/repositories`: existing data-access functions
- `src/services`: AI, prompt, article, and WordPress services
- `src/lib`: Prisma, MySQL, OpenAI, WordPress infrastructure
- `scripts`: standalone workers and CLI processes

## Database access

The project uses both Prisma and direct `mysql2` queries. This is acceptable when purposeful.

## Queue architecture

`production_runs` is the durable queue.

The worker claims queued work using a transaction and:

```sql
FOR UPDATE SKIP LOCKED
```

## Production observability

- `production_run_steps` stores step state.
- `production_run_events` stores chronological events.
- `production_runs` stores overall status and progress.

## WordPress architecture

Use the WordPress REST API for:

- draft creation
- publication
- media upload
- featured media assignment

## Multi-site direction

New automation endpoints and dashboard logic should be site-aware.

## Security direction

Before n8n integration:

- create an automation secret
- validate a bearer token or HMAC signature
- apply per-site limits
- do not expose unrestricted queue endpoints publicly
