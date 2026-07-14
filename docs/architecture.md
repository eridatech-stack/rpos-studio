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
- Failed runs can be returned to the queue; the worker resumes from completed step state.
- Operations pages derive worker activity, stale running runs, and duration metrics from `production_runs`, `production_run_steps`, and `production_run_events`.
- `locked_at` and `worker_id` are the current source of worker visibility; there is no separate heartbeat table.

## Featured images

The production worker generates featured images after draft generation and before WordPress draft creation.

Generated image metadata is stored in `images`, the PNG is saved under `public/generated-images`, the file is uploaded to WordPress Media, and the returned media ID is set as `featured_media` when the WordPress draft is created.

Image generation records OpenAI model, size, quality, and output format in the production event details. It does not estimate image cost unless a future pricing source is added.

## AI usage tracking

Outline and draft generation store OpenAI token usage metadata in the related `jobs.output_data` JSON.

Text cost is an estimate derived from model pricing configured in code or overridden with `AI_USAGE_PRICING_JSON`. The Jobs page displays model, input tokens, output tokens, and estimated cost for jobs that contain usage metadata.

Prompt rendering returns prompt version metadata. Outline and draft jobs store that metadata in `jobs.output_data`, allowing Prompt Studio to aggregate runs, failures, duration, tokens, and estimated cost by prompt version for newly generated jobs.

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

Current automation endpoints use `AUTOMATION_SECRET` as a bearer token and require a caller-provided `siteId`.

Automation queueing is guarded by:

- `AUTOMATION_MAX_ACTIVE_RUNS`
- `AUTOMATION_DAILY_QUEUE_LIMIT`

The n8n operating runbook is documented in `docs/n8n-automation.md`.
