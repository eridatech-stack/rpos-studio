# RPOS Studio Roadmap

## Phase 1 — Operational completion

- [x] Keyword import
- [x] Keyword approval
- [x] Bulk production queue
- [x] Background production worker
- [x] Outline generation
- [x] Draft generation
- [x] WordPress draft creation
- [x] Editorial Review Queue
- [x] Publish Queue
- [x] Manual publication
- [x] Production event table and worker logging foundation
- [x] Production timeline UI
- [x] Retry failed runs
- [x] Auto-refresh for operations pages

## Phase 2 — Featured images

- [x] Generate featured-image prompt
- [x] Generate image
- [x] persist image metadata
- [x] upload image to WordPress Media
- [x] save media ID
- [x] set featured image on WordPress post
- [x] Prompt Studio seed for featured-image prompt
- [x] Article featured-image preview and generation history

## Phase 3 — n8n automation

- [x] protected automation authentication
- [x] protected keyword opportunity import endpoint
- [x] queue-approved-keywords endpoint
- [x] per-site queue limit
- [x] active and daily automation queue limits
- [x] scheduled n8n workflow template
- [ ] live n8n workflow activation
- [x] production summary endpoint
- [x] notification-ready summary response
- [x] operating runbook

## Phase 3.5 — Keyword Pack Generator

- [x] keyword-pack schema and versioned SQL migration
- [x] Prompt Studio seeds for keyword-pack generation prompts
- [x] staged OpenAI generation service
- [x] standalone keyword-pack worker
- [x] create/list/detail/start/retry/cancel APIs
- [x] review/edit/import APIs
- [x] generator page
- [x] packs list page
- [x] pack detail review workspace
- [x] progress and event timeline
- [x] duplicate reporting
- [x] import status choice for needs-review or approved keywords
- [x] validation test coverage for core keyword-pack rules
- [ ] manual 50-keyword end-to-end generation/import test after local migration is applied
- [ ] broader repository/API tests

## Phase 4 — Quality controls

- [x] Manual quality checklist before publishing approval
- [x] Store quality review notes locally
- [x] SEO review
- [x] readability checks
- [x] internal-link suggestions
- [ ] duplicate-content checks
- [ ] factual review workflow
- [x] image alt-text review
- [ ] automated publication eligibility rules

## Phase 5 — Scale and analytics

- [x] worker activity visibility from run locks and events
- [x] multiple-worker visibility
- [x] run duration metrics
- [x] AI token/cost tracking
- [x] prompt performance analytics
- [ ] Google Search Console
- [ ] Google Analytics
- [ ] AdSense revenue tracking
