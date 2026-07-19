# RPOS Studio — Current State

## Product objective

RPOS Studio is being built to automate content operations for `rithm.info` and later support multiple WordPress sites.

The practical target is:

```text
keyword acquisition
→ approval
→ bulk queueing
→ AI content production
→ WordPress draft
→ human editorial review
→ publication
→ scheduled n8n automation
```

## Implemented capabilities

### Keyword management

- Keyword Library
- CSV keyword import
- Developer Tools keyword seeder
- AI Keyword Pack Generator
- generated keyword-pack review and import workflow
- category and topic-cluster mapping
- intent, article type, priority, difficulty, search volume, and opportunity score
- keyword edit page
- guarded keyword deletion
- approved keyword bulk selection

The Keyword Library no longer starts content production. Production starts in the Production Center.

### Production

- MySQL durable queue
- `production_runs`
- `production_run_steps`
- `production_run_events`
- bulk queue API
- failed run retry API and UI
- standalone production worker
- worker locking with `FOR UPDATE SKIP LOCKED`
- attempt count
- worker ID
- progress tracking
- production health metrics from worker locks and run timestamps
- run and step duration metrics
- failure state
- production events logging foundation

### AI generation

- article plan / outline generation
- draft generation
- staged keyword-pack generation for 50, 100, 250, 500, or 1,000 keyword plans
- keyword-pack categories, topic clusters, pillar items, supporting items, validation, and internal-link planning
- prompt rendering
- current date context is injected into production prompts
- Prompt Studio
- prompt versions
- prompt activation / rollback
- OpenAI token usage metadata for outline and draft jobs
- estimated text-generation cost in job output data when pricing is configured
- dashboard totals for current-month and lifetime estimated AI text cost
- Prompt Studio performance analytics by prompt version for new jobs
- image-generation model, size, and quality metadata in production events

### WordPress

- create WordPress draft
- update existing WordPress draft after local edits or media changes
- map RPOS article category to WordPress category during draft creation
- disable comments and pings on WordPress drafts
- strip duplicate leading title from WordPress draft content
- send Yoast SEO title, meta description, and focus keyword when accepted by WordPress REST
- upload generated featured image to WordPress Media
- set generated image as WordPress featured image
- save WordPress post ID and draft URL
- editorial approval
- publish approved post
- save published URL and publish date

### Editorial workflow

- Editorial Review Queue
- Quality checklist required before approval for publishing
- Automated SEO/readability/link/image review saved with editorial notes
- Approve for Publishing
- Publish Queue
- Publish Now
- status-aware article detail actions

### UI

- AppShell sidebar and top bar
- shared UI components
- Keyword Pack Generator
- Keyword Packs list and detail review workspace
- metric cards
- cards
- status chips
- progress bars
- auto-refresh on operations pages
- empty states
- toast notifications
- reusable async action button
- multi-site Operations Dashboard

## Current production flow

```text
Approved keyword
→ BulkKeywordProduction component
→ POST /api/production/start-keywords-bulk
→ enqueueBulkKeywordProduction()
→ enqueueKeywordProduction()
→ insert production_runs row
→ insert production_run_steps rows
→ log run_queued event
→ worker claims run
→ log worker_claimed event
→ outline step
→ draft step
→ featured image step
→ WordPress draft step
→ log run_completed event
→ article appears in Editorial Review Queue
```

## Current keyword-pack flow

```text
User creates keyword pack draft
→ user queues generation
→ keyword-pack worker claims queued pack
→ strategy / categories / clusters / keyword chunks
→ validation and duplicate detection
→ internal-link planning
→ user reviews, edits, approves, or rejects generated items
→ user imports approved items into categories, topic_clusters, and keywords
→ imported keywords appear in Keyword Library and can later be queued from Production Center
```

Keyword-pack generation and import do not automatically start article production.

## Important cleanup already completed

Removed or retired:

- article-based Start Production button
- synchronous article-based production API
- obsolete ProductionRunService
- obsolete ProductionWorkflowRunner
- obsolete single-keyword production endpoint
- obsolete Generate button from Keyword Library

The valid production path is keyword-driven and asynchronous.

## Known implementation notes

- Some repositories use Prisma.
- Queue and reporting code often use direct `mysql2` queries.
- Environment values exist across `.env.local` and `.env`.
- Worker scripts must load env files before dynamic application imports.
- Prisma client is generated from `@prisma/client`.
- On Windows, Prisma DLL locking may require stopping `npm run dev`, the worker, Prisma Studio, and other Node processes.

## Immediate work remaining

### 1. Keyword-pack generator hardening

Implemented:

- dedicated keyword-pack schema and SQL migration
- prompt keys for staged keyword-pack generation
- standalone keyword-pack worker command
- create/list/detail/start/retry/cancel/review/edit/import APIs
- generator page, packs list, detail progress, timeline, and review table
- duplicate reporting and import result summary
- import status choice for `needs_review` or `approved`
- validation tests for normalization, duplicates, excluded topics, parent pillar assignment, and pack-size enforcement

Remaining hardening:

- apply the SQL migration to the local database and regenerate Prisma
- seed the keyword-pack Prompt Studio prompt versions in each environment
- manually run a small 50-keyword pack through worker generation and import
- add broader repository/API tests once the project has a larger test harness

### 2. n8n workflow wiring

n8n can call protected RPOS endpoints to queue approved keywords and request production summaries.

Implemented:

- bearer-token automation authentication via `AUTOMATION_SECRET`
- keyword opportunity import endpoint for scheduled SEO-data refreshes
- queue-approved-keywords endpoint
- production summary endpoint
- active and daily queue limits
- notification-ready summary text
- operating runbook in `docs/n8n-automation.md`
- importable starter workflow in `docs/n8n-workflows/rpos-keyword-production-automation.json`

### 3. Featured-image hardening

Implemented target flow:

```text
draft generated
→ generate featured image
→ store image metadata
→ upload to WordPress Media
→ save WordPress media ID
→ set featured_media on WordPress post
→ complete WordPress draft
```

Remaining hardening:

- add quality review controls
- add richer image approval/rejection controls
- add a CSV-driven repair tool for already-uploaded oversized WordPress images

### 4. n8n automation workflow

n8n should:

- run on a schedule
- request up to X approved keywords for a site
- queue them
- optionally query production summary
- send success/failure summary

RPOS should remain responsible for queue state, worker execution, retries, event history, and WordPress publishing state.

The repository includes a starter workflow template. A live n8n instance still needs environment configuration, manual test execution, provider-specific keyword-source mapping, and activation.

### 5. Human publishing control

Keep final publication manual until content-quality checks are stable.
