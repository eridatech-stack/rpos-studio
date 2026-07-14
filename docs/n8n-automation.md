# n8n Automation Runbook

## Purpose

Use n8n to queue approved RPOS keywords on a schedule and send a production summary without letting n8n own production state.

RPOS remains responsible for:

- keyword selection
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

## Endpoint authentication

Every n8n HTTP Request node must send:

```http
Authorization: Bearer {{ $env.RPOS_AUTOMATION_SECRET }}
Content-Type: application/json
```

Use an n8n environment variable or credential for the secret. Do not hardcode it into workflow nodes.

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

2. HTTP Request: Queue approved keywords
   - Method: `POST`
   - URL: `/api/automation/queue-approved-keywords`
   - Send bearer token header.
   - Body: `{ "siteId": "...", "limit": 3 }`

3. Wait
   - Optional, 1-5 minutes.
   - Lets the worker claim queued runs before summary.

4. HTTP Request: Production summary
   - Method: `POST`
   - URL: `/api/automation/production-summary`
   - Same bearer token header.

5. Notification node
   - Use `notification.title` as subject/title.
   - Use `notification.text` as the message body.
   - If `notification.status` is `attention_required`, send to a higher-priority channel.

## Operating guidance

- Keep final publication manual.
- Start with `limit: 1` or `limit: 3`.
- Increase only after review quality is stable.
- Watch `/production/runs` after first automation runs.
- Retry failed runs from RPOS, not n8n.
