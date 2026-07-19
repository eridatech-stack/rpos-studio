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

Keyword-pack generation follows the same durable-queue principle with a separate worker:

```text
Keyword Pack UI
        ↓
Keyword Pack API routes
        ↓
keyword_packs + draft category / cluster / item tables
        ↓
Standalone keyword-pack worker
        ↓
OpenAI staged generation
        ↓
human review and explicit import into live keyword tables
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

`keyword_packs` is the durable queue for AI keyword-pack generation. The keyword-pack worker claims queued packs with the same transactional locking pattern, writes timeline events to `keyword_pack_events`, and stores generated categories, clusters, and items in draft tables until a user explicitly imports approved items.

Keyword-pack generation is intentionally separate from article production. Importing approved keyword-pack items creates or matches live `categories`, `topic_clusters`, and `keywords`, but it does not enqueue production runs.

## Keyword-pack generator

The generator uses staged OpenAI calls rather than one large response:

- strategy
- categories
- topic clusters
- keyword chunks
- validation and shortfall filling
- internal-link relationship planning

Generated SEO metrics are AI estimates only. Duplicate detection compares generated items inside the pack and existing live keywords for the selected site. Existing live keyword matches are flagged as duplicates and skipped during import.

The import workflow is idempotent at the live keyword level because it checks the existing `site_id + keyword` uniqueness before inserting. Users choose whether newly imported approved keywords become `needs_review` or `approved`; the default is `needs_review`.

## Production observability

- `production_run_steps` stores step state.
- `production_run_events` stores chronological events.
- `production_runs` stores overall status and progress.
- Failed runs can be returned to the queue; the worker resumes from completed step state.
- Operations pages derive worker activity, stale running runs, and duration metrics from `production_runs`, `production_run_steps`, and `production_run_events`.
- `locked_at` and `worker_id` are the current source of worker visibility; there is no separate heartbeat table.

## Featured images

The production worker generates featured images after draft generation and before WordPress draft creation.

Generated image metadata is stored in `images`, the generated file is saved under `public/generated-images`, the file is uploaded to WordPress Media, and the returned media ID is set as `featured_media` when the WordPress draft is created. By default featured images use compressed WebP output (`OPENAI_IMAGE_OUTPUT_FORMAT=webp`, `OPENAI_IMAGE_OUTPUT_COMPRESSION=75`, `OPENAI_IMAGE_QUALITY=medium`) to avoid oversized WordPress media files. When a featured image is regenerated, previous WordPress media IDs recorded by RPOS for that article are deleted after the replacement media has been attached to the draft.

Image generation records OpenAI model, size, quality, and output format in the production event details. It does not estimate image cost unless a future pricing source is added.

## AI usage tracking

Outline and draft generation store OpenAI token usage metadata in the related `jobs.output_data` JSON.

Text cost is an estimate derived from model pricing configured in code or overridden with `AI_USAGE_PRICING_JSON`. The Jobs page displays model, input tokens, output tokens, and estimated cost for jobs that contain usage metadata.

Prompt rendering returns prompt version metadata. Outline and draft jobs store that metadata in `jobs.output_data`, allowing Prompt Studio to aggregate runs, failures, duration, tokens, and estimated cost by prompt version for newly generated jobs.

Prompt rendering also injects current date context into article planning, article drafting, and featured-image prompt generation. The default content timezone is `Asia/Yerevan` and can be overridden with `CONTENT_TIME_ZONE`. Prompt text can use `{{current_date}}`, `{{current_year}}`, `{{content_time_zone}}`, and `{{date_context}}`.

Article planning also enforces SEO meta title length at generation time. The plan prompt asks for `meta_title` between 35 and 65 characters, and the article plan normalizer trims overlong generated meta titles at word boundaries before saving.

Keyword-pack generation uses Prompt Studio keys for strategy, categories, clusters, items, validation, gap filling, and internal links. The worker records timeline events around generation stages and keeps the design open for future SEO-data providers.

## Quality controls

Manual quality review remains the publishing gate. Automated review is available on article detail pages and stores deterministic SEO, readability, link, and featured-image findings in `articles.editor_notes.automatedReview`. Saving the manual checklist preserves automated review results.

## WordPress architecture

Use the WordPress REST API for:

- draft creation
- publication
- media upload
- featured media assignment

WordPress draft creation resolves the RPOS article category to a WordPress category by `wp_category_id:<id>` in the local category description, then WordPress slug, then exact WordPress category name. If no mapping is found, draft creation fails instead of silently using the WordPress default category. Drafts are created with comments and pings closed.

Draft content strips a generated leading title heading before upload because WordPress renders the post title separately. Draft creation also sends Yoast SEO meta fields (`_yoast_wpseo_title`, `_yoast_wpseo_metadesc`, `_yoast_wpseo_focuskw`) when WordPress accepts them through REST; if protected meta is rejected, the draft is still created and the intended SEO payload is recorded in the WordPress job output.

After a WordPress draft exists, article pages can sync the latest local Markdown, title, slug, excerpt, category, featured image media ID, comments setting, pings setting, and Yoast SEO payload back to the same WordPress draft post.

## Multi-site direction

New automation endpoints and dashboard logic should be site-aware.

## Security direction

Before n8n integration:

- create an automation secret
- validate a bearer token or HMAC signature
- apply per-site limits
- do not expose unrestricted queue endpoints publicly

Current automation endpoints use `AUTOMATION_SECRET` as a bearer token and require a caller-provided `siteId`.

Keyword opportunity imports can be posted to the protected automation API as provider-neutral JSON. New keywords default to `needs_review`, existing keywords are matched by the existing `site_id + keyword` unique key, and refreshes update metrics without deleting old keyword records.

Automation queueing is guarded by:

- `AUTOMATION_MAX_ACTIVE_RUNS`
- `AUTOMATION_DAILY_QUEUE_LIMIT`

The n8n operating runbook is documented in `docs/n8n-automation.md`.
