# RPOS Studio — Keyword Pack Generator TODO

## Objective

Implement a complete AI Keyword Pack Generator inside RPOS Studio.

Read these first:

- `AGENTS.md`
- `docs/current-state.md`
- `docs/architecture.md`
- `docs/roadmap.md`
- `prisma/schema.prisma`
- existing keyword import, category, topic cluster, prompt, OpenAI, worker, production, and UI modules

Before changing code, inspect the repository and report:

1. Existing files and modules that can be reused.
2. Current keyword, category, topic-cluster, prompt, and site models.
3. Current OpenAI and prompt-version patterns.
4. Current UI components, toasts, action buttons, and page conventions.
5. Required schema changes.
6. A batch-by-batch implementation plan.

Do not begin implementation until that inspection is complete.

---

## Feature goal

Create a Keyword Pack Generator capable of generating:

- 50 keywords
- 100 keywords
- 250 keywords
- 500 keywords
- 1,000 keywords

Do not support more than 1,000 keywords in one request initially.

The generator must create a structured SEO content plan containing:

- site
- categories
- topic clusters
- pillar articles
- supporting cluster articles
- keyword intent
- article type
- priority
- estimated search volume
- estimated difficulty
- AI opportunity score
- internal-link relationships
- generation metadata

The result must be a coherent topic architecture, not a flat keyword list.

---

## User workflow

Add a new RPOS section:

```text
Keyword Pack Generator
```

Suggested routes:

```text
/keywords/generator
/keywords/packs
/keywords/packs/[id]
```

Workflow:

1. Select a site.
2. Enter a niche or broad subject.
3. Optionally enter:
   - target countries
   - target language
   - audience
   - business goal
   - monetization model
   - excluded topics
   - preferred categories
   - brand notes
4. Select pack size:
   - 50
   - 100
   - 250
   - 500
   - 1,000
5. Select generation mode:
   - balanced
   - low-competition
   - high-traffic
   - commercial
   - informational
6. Preview proposed category and cluster structure.
7. Confirm generation.
8. Start generation as a background job.
9. Show progress and timeline events.
10. Review generated categories, clusters, and keywords.
11. Approve all, reject selected, or edit individual items.
12. Import approved content into:
   - `categories`
   - `topic_clusters`
   - `keywords`
13. Do not automatically queue article production.
14. Imported approved keywords must become available in Production Center.

---

## Architecture requirements

Do not run large keyword generation inside a long-running HTTP request.

Use this architecture:

```text
UI
→ POST generation request
→ create keyword-pack job
→ background worker processes job
→ save draft categories, clusters, and keywords
→ UI displays progress
→ user reviews
→ user imports approved data into live tables
```

Use a dedicated keyword-pack worker unless the existing worker architecture can be extended cleanly without mixing article production and keyword generation responsibilities.

Suggested command:

```text
npm run worker:keyword-packs
```

Do not mix keyword-pack generation jobs with article-production runs without a strong architectural reason.

---

## Suggested database model

Inspect the current schema first and follow existing naming conventions.

Add versioned SQL migrations.

### `keyword_packs`

Suggested fields:

```text
id
site_id
name
niche
target_language
target_countries
audience
business_goal
monetization_model
excluded_topics
preferred_categories
brand_notes
generation_mode
requested_keyword_count
status
progress_percent
current_step
error_message
created_by
created_at
started_at
finished_at
updated_at
```

Suggested statuses:

```text
draft
queued
running
ready_for_review
importing
completed
failed
cancelled
```

### `keyword_pack_categories`

Suggested fields:

```text
id
keyword_pack_id
name
slug
description
priority
sort_order
status
created_at
```

### `keyword_pack_clusters`

Suggested fields:

```text
id
keyword_pack_id
category_id
name
slug
description
pillar_keyword
pillar_title
sort_order
status
created_at
```

### `keyword_pack_items`

Suggested fields:

```text
id
keyword_pack_id
category_id
cluster_id
keyword
suggested_title
intent
article_type
priority
estimated_search_volume
estimated_difficulty
ai_opportunity_score
is_pillar
parent_pillar_item_id
related_item_ids_json
notes
review_status
existing_keyword_id
created_at
updated_at
```

Suggested review statuses:

```text
pending
approved
rejected
edited
imported
duplicate
```

### `keyword_pack_events`

Suggested fields:

```text
id
keyword_pack_id
event_type
status
message
details_json
created_at
```

Use UUIDs and patterns consistent with the existing schema.

---

## Existing Prisma enum constraints

Use actual enum values from the current schema.

### Keyword intent

```text
informational
commercial
transactional
navigational
```

### Keyword article type

```text
pillar
cluster
faq
review
comparison
news
how_to
```

Do not use unsupported values such as `checklist` unless a deliberate schema migration is added.

### Keyword priority

```text
high
medium
low
```

### Keyword status

```text
new
approved
planned
used
rejected
needs_review
```

### Keyword content stage

```text
keyword
planned
outlined
drafted
review
published
```

### Keyword created by

```text
manual
ai
import
api
```

Import Prisma types from:

```ts
@prisma/client
```

Do not import from a guessed generated-client path.

---

## Generation strategy

Do not generate 1,000 keywords in one OpenAI response.

Use staged generation.

### Stage 1 — Strategy

Generate:

- niche summary
- audience interpretation
- category architecture
- target cluster count
- recommended keyword distribution
- intent mix
- pillar/supporting ratio

### Stage 2 — Categories

For each category generate:

- name
- slug
- description
- priority
- approximate keyword allocation

### Stage 3 — Topic clusters

For each cluster generate:

- category
- name
- slug
- description
- pillar keyword
- pillar article title
- supporting article count

### Stage 4 — Keywords

Generate in chunks of approximately:

```text
25–50 keywords per OpenAI call
```

Each item must contain:

```text
keyword
suggested_title
intent
article_type
priority
estimated_search_volume
estimated_difficulty
ai_opportunity_score
is_pillar
category
cluster
parent_pillar_keyword
notes
```

### Stage 5 — Validation

Before marking ready for review:

- normalize keyword casing
- trim whitespace
- remove exact duplicates
- detect near duplicates
- validate enum values
- ensure every cluster has one pillar
- ensure every supporting item references a valid pillar
- verify requested count
- fill shortfalls with extra generation calls
- avoid exceeding requested count
- validate excluded topics
- flag duplicates already present in the site's live keyword library

### Stage 6 — Internal linking plan

Create planning relationships:

- supporting article → cluster pillar
- pillar → selected supporting articles
- related supporting articles within a cluster
- optional cross-cluster links within the same category

Do not insert links into live articles yet.

Store relationships as planning metadata for later article generation.

---

## Prompt Studio integration

Do not hardcode all prompts in services.

Add prompt keys following the existing Prompt Studio and prompt-version architecture:

```text
keyword_pack_strategy
keyword_pack_categories
keyword_pack_clusters
keyword_pack_items
keyword_pack_validation
keyword_pack_fill_gaps
keyword_pack_internal_links
```

Requirements:

- use structured JSON
- include strict enum instructions
- include site context
- include target country and language
- include previously generated categories/clusters when relevant
- forbid duplicate prior items
- forbid unsupported schema fields
- record prompt version and model used

---

## SEO metrics handling

Treat search volume, difficulty, and opportunity score as AI estimates.

Use labels such as:

```text
Estimated Search Volume
Estimated Difficulty
AI Opportunity Score
```

Show this notice:

```text
Metrics are AI estimates for prioritization and should be validated with an SEO data provider before major publishing decisions.
```

Do not overwrite verified SEO data.

Keep the architecture open for future providers such as:

- Google Ads Keyword Planner
- DataForSEO
- Semrush
- Ahrefs

Do not implement paid-provider integration in this feature.

---

## Required UI

### `/keywords/generator`

Form fields:

- site selector
- pack name
- niche
- language
- target countries
- audience
- business goal
- monetization model
- excluded topics
- preferred categories
- brand notes
- pack size
- generation mode

Actions:

- Generate Preview
- Save Draft
- Start Generation

### `/keywords/packs`

Display:

- name
- site
- niche
- requested count
- generated count
- status
- progress
- created date
- actions

### `/keywords/packs/[id]`

Display:

- summary metrics
- progress
- event timeline
- categories
- clusters
- keyword review table
- search and filters
- pagination
- bulk selection
- approve selected
- reject selected
- approve all
- import approved
- retry failed generation
- cancel queued/running generation

### Review table columns

- checkbox
- keyword
- suggested title
- category
- cluster
- pillar/supporting
- intent
- article type
- priority
- estimated volume
- estimated difficulty
- AI opportunity score
- review status
- edit action

Do not render all 1,000 rows at once. Use pagination or server-side filtering.

Use existing shared UI components and visual conventions.

---

## Suggested API routes

```text
POST   /api/keyword-packs
GET    /api/keyword-packs
GET    /api/keyword-packs/[id]
PATCH  /api/keyword-packs/[id]

POST   /api/keyword-packs/[id]/start
POST   /api/keyword-packs/[id]/retry
POST   /api/keyword-packs/[id]/cancel
POST   /api/keyword-packs/[id]/review
POST   /api/keyword-packs/[id]/import

GET    /api/keyword-packs/[id]/items
PATCH  /api/keyword-packs/[id]/items/[itemId]
```

Validate all request bodies.

Use transactions for import.

Do not allow duplicate imports.

---

## Import behavior

When importing approved items:

1. Match or create categories by:
   - `site_id`
   - `slug`
2. Match or create topic clusters by:
   - `site_id`
   - `category_id`
   - `slug`
3. Insert keywords using the existing unique constraint:
   - `site_id`
   - `keyword`
4. Preserve existing keyword records.
5. Do not overwrite existing reviewed data without explicit user approval.
6. Return:
   - categories created
   - clusters created
   - keywords created
   - keywords skipped
   - duplicates found
   - failures
7. Mark successfully imported items as `imported`.
8. Record an import event.
9. Do not queue production automatically.

New imported keywords should default to:

```text
status = needs_review
content_stage = keyword
created_by = ai
```

Allow the user to choose whether imported approved keywords become:

```text
needs_review
```

or:

```text
approved
```

Default to `needs_review`.

---

## Worker requirements

The keyword-pack worker must:

- load `.env.local` and `.env` before importing application modules
- poll queued packs
- claim work transactionally
- support multiple workers safely
- update progress
- write timeline events
- store intermediate results
- resume safely where practical
- mark failures clearly
- avoid partial live imports
- stop gracefully on `SIGINT` and `SIGTERM`
- check cancellation between stages and chunks

Suggested progress:

```text
5% strategy
15% categories
30% clusters
80% keyword chunks
90% validation
97% internal-link map
100% ready for review
```

---

## Reliability

- retry transient OpenAI failures
- use exponential backoff
- validate structured JSON
- retry failed chunks independently
- persist completed chunks
- avoid duplicate items after retry
- record token usage when available
- record approximate cost when practical
- record model and prompt version
- do not expose secrets
- do not expose raw OpenAI errors to users

---

## Cancellation

Queued or running packs must support cancellation.

The worker should check cancellation between stages and chunks.

Do not interrupt in the middle of a transaction.

---

## Security

- follow the app's current authentication model
- validate site access
- sanitize user input
- enforce maximum input lengths
- enforce pack size limits
- rate-limit generation starts if a pattern already exists
- do not expose secrets or raw provider errors
- prevent more than one running pack per site by default

---

## Cost controls

Show estimated AI usage:

```text
50 = low
100 = low
250 = medium
500 = high
1000 = high
```

Require confirmation before starting 500 or 1,000 keyword packs.

Warn when another pack already exists for the same site and niche.

---

## Duplicate prevention

Before generation:

- warn about similar existing packs
- show similar pack names
- show relevant existing keyword counts where possible

During generation compare against:

- current pack items
- live site keywords
- rejected pack items

Flag existing-site duplicates rather than silently importing them.

---

## Testing

Add tests where supported.

At minimum test:

- enum validation
- keyword normalization
- exact duplicate detection
- near-duplicate detection
- pack size enforcement
- import idempotency
- category matching
- cluster matching
- cancellation
- retry behavior
- invalid JSON handling
- review-status updates
- worker claim locking

---

## Implementation batches

### Batch 1

- schema
- versioned SQL migration
- repositories
- domain types
- prompt keys
- prompt-version seeds
- no UI

Stop, run build/type-check, and report results.

### Batch 2

- generation service
- staged OpenAI generation
- validation
- event logging
- worker
- worker script
- npm command

Stop, run build/type-check and tests, and report results.

### Batch 3

- create/list/detail APIs
- start/retry/cancel APIs
- review/edit APIs
- import API

Stop, run build/type-check and tests, and report results.

### Batch 4

- generator page
- pack list
- pack detail
- progress
- event timeline
- review table
- filters
- pagination

Stop, run build/type-check and tests, and report results.

### Batch 5

- import workflow
- duplicate reporting
- bulk review actions
- UX polish
- tests
- documentation

Stop, run full verification, and report results.

Do not continue to the next batch until the current batch builds successfully.

---

## Verification requirements

After each batch report:

- files changed
- migrations added
- commands run
- type-check result
- test result
- build result
- unresolved issues
- manual verification steps

After schema changes provide exact commands for:

```text
apply SQL migration
npx prisma db pull
npx prisma generate
npm run dev
npm run worker:production
npm run worker:keyword-packs
```

Do not run destructive migrations automatically.

---

## Acceptance criteria

The feature is complete when:

1. A user can create a 50–1,000 keyword pack.
2. Generation runs in a background worker.
3. Categories are generated first.
4. Clusters are generated second.
5. Keywords are generated in chunks.
6. Duplicate and enum validation runs.
7. Internal-link relationships are stored.
8. Progress and timeline events are visible.
9. Users can review and edit generated items.
10. Users can approve or reject items in bulk.
11. Approved items can be imported into live categories, clusters, and keywords.
12. Import is idempotent.
13. Imported keywords appear in Keyword Library.
14. Imported approved keywords can later be queued from Production Center.
15. Article generation does not start automatically.
16. Type-check, tests, and production build pass.
