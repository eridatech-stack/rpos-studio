# n8n Automation Runbook

## Purpose

Use n8n to queue approved RPOS keywords on a schedule and send a production summary without letting n8n own production state.

RPOS remains responsible for:

- keyword selection
- keyword opportunity dedupe and refresh
- queue limits
- production run state
- worker execution
- retries
- WordPress draft and publishing state

## Required RPOS environment

```env
AUTOMATION_SECRET=use-a-long-random-secret
AUTOMATION_MAX_ACTIVE_RUNS=10
AUTOMATION_DAILY_QUEUE_LIMIT=25
```

`AUTOMATION_SECRET` is sent by n8n as a bearer token.

## Required n8n environment

Configure these in n8n before activating the workflow:

```env
RPOS_BASE_URL=https://your-rpos-domain.com
RPOS_SITE_ID=SITE_UUID
RPOS_AUTOMATION_SECRET=same-value-as-rpos-automation-secret
RPOS_QUEUE_LIMIT=3
```

An importable starter workflow is available at:

```text
docs/n8n-workflows/rpos-keyword-production-automation.json
```

Import it into n8n, replace the sample keyword payload node with your SEO provider mapping, test manually, then activate the schedule.

## Endpoint authentication

Every n8n HTTP Request node must send:

```http
Authorization: Bearer {{ $env.RPOS_AUTOMATION_SECRET }}
Content-Type: application/json
```

Use an n8n environment variable or credential for the secret. Do not hardcode it into workflow nodes.

## Import keyword opportunities

```http
POST https://your-rpos-domain.com/api/automation/import-keyword-opportunities
```

Body:

```json
{
  "siteId": "SITE_UUID",
  "defaultStatus": "needs_review",
  "updateExistingStatus": false,
  "opportunities": [
    {
      "keyword": "best free task management apps",
      "categorySlug": "productivity",
      "clusterSlug": "task-management",
      "intent": "commercial",
      "articleType": "comparison",
      "priority": "high",
      "searchVolume": 5400,
      "difficulty": 38,
      "cpc": 2.15,
      "opportunityScore": 87,
      "relatedKeywords": [
        "free project management software",
        "best todo list app"
      ],
      "source": "DataForSEO"
    }
  ]
}
```

Behavior:

- bearer-token authentication is required
- request size is capped at 500 opportunities
- new keywords default to `needs_review`
- existing keywords are matched by `siteId + keyword`
- existing keyword metrics are refreshed without changing status unless `updateExistingStatus` is `true`
- no keywords are deleted by this endpoint

Successful response:

```json
{
  "success": true,
  "total": 1,
  "inserted": 1,
  "updated": 0,
  "skipped": 0,
  "errors": [],
  "message": "Imported 1 new keyword(s), refreshed 0, skipped 0."
}
```

## Queue approved keywords

```http
POST https://your-rpos-domain.com/api/automation/queue-approved-keywords
```

Body:

```json
{
  "siteId": "SITE_UUID",
  "limit": 5
}
```

Behavior:

- only approved keywords are selected
- keywords already in queued/running production are skipped
- request `limit` is capped at 25
- site active queue is capped by `AUTOMATION_MAX_ACTIVE_RUNS`
- daily queue volume is capped by `AUTOMATION_DAILY_QUEUE_LIMIT`

Successful response with queued work:

```json
{
  "success": true,
  "requested": 5,
  "queued": 5,
  "failed": 0,
  "runs": [
    {
      "keywordId": "KEYWORD_UUID",
      "productionRunId": "RUN_UUID"
    }
  ],
  "errors": [],
  "limits": {
    "requestedLimit": 5,
    "allowedLimit": 5,
    "maxRequestLimit": 25,
    "maxActiveRuns": 10,
    "dailyQueueLimit": 25,
    "activeRuns": 0,
    "queued": 0,
    "running": 0,
    "queuedToday": 0,
    "activeCapacity": 10,
    "dailyCapacity": 25
  }
}
```

Successful response when no work is queued:

```json
{
  "success": true,
  "requested": 0,
  "queued": 0,
  "failed": 0,
  "runs": [],
  "errors": [],
  "message": "Automation queue limits are already reached for this site."
}
```

## Production summary

```http
POST https://your-rpos-domain.com/api/automation/production-summary
```

Body:

```json
{
  "siteId": "SITE_UUID"
}
```

Response includes:

- production counts
- keyword counts
- editorial counts
- recent failures
- recent completions
- notification-ready text

Example:

```json
{
  "success": true,
  "siteId": "SITE_UUID",
  "summary": {
    "generatedAt": "2026-07-14T12:00:00.000Z",
    "production": {
      "queued": 2,
      "running": 1,
      "completed": 18,
      "failed": 0
    },
    "editorial": {
      "reviewRequired": 3,
      "readyToPublish": 1,
      "publishedToday": 0
    },
    "recentFailures": [],
    "recentCompleted": []
  },
  "notification": {
    "status": "in_progress",
    "title": "rithm.info: production summary",
    "text": "rithm.info production summary\nQueued: 2\nRunning: 1\nCompleted: 18\nFailed: 0\nNeeds review: 3\nReady to publish: 1"
  }
}
```

## Suggested n8n workflow

1. Schedule Trigger
   - Run hourly or daily.
   - Start conservatively, such as once per day.

2. HTTP Request: Fetch keyword opportunities
   - Use your SEO provider, Google Trends workflow, or another keyword source.
   - Normalize each item into the import body above.
   - The starter workflow uses a Code node with one sample opportunity. Replace that node when a real provider is connected.

3. HTTP Request: Import keyword opportunities
   - Method: `POST`
   - URL: `/api/automation/import-keyword-opportunities`
   - Send bearer token header.
   - Body: `{ "siteId": "...", "defaultStatus": "needs_review", "opportunities": [...] }`

4. Optional human review
   - Review `needs_review` keywords in RPOS.
   - Approve only the keywords that should enter production.

5. HTTP Request: Queue approved keywords
   - Method: `POST`
   - URL: `/api/automation/queue-approved-keywords`
   - Send bearer token header.
   - Body: `{ "siteId": "...", "limit": 3 }`

6. Wait
   - Optional, 1-5 minutes.
   - Lets the worker claim queued runs before summary.

7. HTTP Request: Production summary
   - Method: `POST`
   - URL: `/api/automation/production-summary`
   - Same bearer token header.

8. Notification node
   - Use `notification.title` as subject/title.
   - Use `notification.text` as the message body.
   - If `notification.status` is `attention_required`, send to a higher-priority channel.

## Operating guidance

- Keep final publication manual.
- Keep imported keyword opportunities as `needs_review` until the topic sourcing is trusted.
- Start with `limit: 1` or `limit: 3`.
- Increase only after review quality is stable.
- Watch `/production/runs` after first automation runs.
- Retry failed runs from RPOS, not n8n.
