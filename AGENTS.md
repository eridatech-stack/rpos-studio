# AGENTS.md — RPOS Studio

## Project purpose

RPOS Studio is an AI-assisted publishing operating system for managing the complete content lifecycle:

- keyword import and approval
- bulk production queueing
- background article generation
- WordPress draft creation
- editorial review
- publishing
- production monitoring
- prompt management
- future image generation and n8n automation

The immediate business goal is to automate content creation for `https://rithm.info` while keeping human review and final publication controlled until quality is stable.

## Working principles

1. Inspect the existing implementation before modifying it.
2. Prefer small, testable changes over broad rewrites.
3. Preserve working flows unless a replacement is fully implemented and tested.
4. Use the real Prisma schema and generated enum names. Do not infer field names.
5. Do not reintroduce the obsolete article-based Start Production flow.
6. Production begins from approved keywords.
7. Long-running AI work must run in the background worker, not in HTTP request handlers.
8. Use MySQL as the durable queue and source of operational state.
9. Use `router.refresh()` rather than `window.location.reload()` after client-side actions.
10. Use toast notifications rather than `alert()`.
11. Keep final publication human-controlled until the automated quality pipeline is reliable.
12. Before deleting files, search the repository for references and verify the app still builds.
13. Never commit `.env`, `.env.local`, API keys, database passwords, WordPress application passwords, or generated secrets.
14. When changing the database:
    - add a versioned SQL migration
    - run `npx prisma db pull`
    - run `npx prisma generate`
    - update affected repository and API types
15. On Windows, stop all Node processes before `prisma generate` if Prisma's query engine DLL is locked.

## Technology stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- MySQL
- Prisma Client from `@prisma/client`
- `mysql2` for some direct SQL repositories and queue operations
- OpenAI API
- WordPress REST API
- separate TypeScript production worker launched with `npm run worker:production`
- `tsx` for standalone TypeScript scripts

## Environment loading

Next.js loads `.env.local` automatically. Standalone workers do not.

Standalone scripts must load environment variables before importing application modules that initialize database or OpenAI clients.

Use this pattern:

```ts
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const module = await import("../src/...");
```

Important variables include:

- `DATABASE_URL`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `OPENAI_API_KEY`
- `WORDPRESS_URL`
- `WORDPRESS_USERNAME`
- `WORDPRESS_APP_PASSWORD`
- `PRODUCTION_WORKER_POLL_MS`

## Current production flow

```text
CSV/imported keyword
→ keyword status approved
→ user selects one or more keywords in Production Center
→ POST /api/production/start-keywords-bulk
→ MySQL production run(s) created with queued steps
→ production worker claims queued run
→ generate outline / article plan
→ generate article draft
→ create WordPress draft
→ article status wordpress_draft
→ Editorial Review Queue
→ approve article
→ article status approved
→ Publish Queue
→ publish WordPress post
→ article status published
```

## Current operational components

- Operations Dashboard
- Keyword Library
- Keyword CSV Import
- Keyword Edit and guarded Delete
- Articles list and article detail/editor
- Production Center
- Production Runs
- Jobs history
- Prompt Studio
- Prompt versioning and activation
- Editorial Review Queue
- Publish Queue
- Developer Tools keyword seeder
- Toast system
- Progress bars
- MySQL-backed production worker
- Production run events table and logging foundation

## Valid production entry point

Keep:

```text
/api/production/start-keywords-bulk
```

Do not restore:

```text
/api/production/start
/api/production/start-keyword
```

The bulk endpoint supports one or many selected keywords.

## Prisma details

Prisma Client is imported from:

```ts
import { PrismaClient } from "@prisma/client";
```

Keyword enum types are:

```ts
keywords_intent
keywords_priority
keywords_status
keywords_article_type
```

Import them from `@prisma/client`.

Important keyword fields include:

- `keyword`
- `intent`
- `search_volume`
- `difficulty`
- `cpc`
- `opportunity_score`
- `priority`
- `status`
- `article_type`
- `content_stage`
- `created_by`

Do not use `keyword_difficulty`; the actual field is `difficulty`.

## User experience rules

- Production Center is for queueing and monitoring automated work.
- Keyword Library is for managing keyword data; it should not contain Generate buttons.
- Article pages are status-aware editorial workspaces:
  - `outline_ready` → Generate Draft
  - `draft_ready` → Create WordPress Draft
  - `wordpress_draft` / `human_review` → Approve for Publishing
  - `approved` → Publish Now
  - `published` → Open Live Article
- Review Queue contains WordPress drafts requiring human review.
- Publish Queue contains approved articles ready for public publishing.
- Use shared UI components where available.
- Preserve responsive layouts and existing visual language.

## Immediate roadmap

Priority order:

1. Complete Production Run timeline UI using `production_run_events`.
2. Add retry for failed production runs.
3. Add featured-image generation.
4. Upload generated images to WordPress Media.
5. Set generated image as WordPress featured image.
6. Add protected automation endpoint for n8n.
7. Build n8n scheduled workflow to queue approved keywords.
8. Add automation summary and failure notifications.
9. Add auto-refresh/polling to operations pages.
10. Add quality validation before automated publishing.
11. Keep final publication manual initially.

## Required first actions for Codex

Before making changes:

1. Inspect:
   - `package.json`
   - `prisma/schema.prisma`
   - `src/lib/prisma.ts`
   - `src/lib/db.ts`
   - `src/lib/openai.ts`
   - `src/lib/wordpress.ts`
   - `scripts/production-worker.ts`
   - `src/modules/workflow/services/ProductionQueueWorker.ts`
   - `src/modules/workflow/services/KeywordProductionQueueService.ts`
   - `src/modules/production`
   - `src/modules/editorial`
   - `src/app/production`
   - `src/app/content`
   - `src/app/keywords`
   - `src/components`
2. Run:
   - `git status`
   - `npm run build` or the project type-check command
   - tests if present
3. Report:
   - current errors
   - dead or duplicate code
   - proposed files to change
4. Make changes in small batches.
5. After each batch:
   - run build/type-check
   - summarize changed files
   - explain manual verification steps
