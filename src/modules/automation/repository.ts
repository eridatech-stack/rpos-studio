import { db } from "@/lib/db";

export async function getApprovedKeywordIdsForAutomation(input: {
  siteId: string;
  limit: number;
}) {
  const [rows]: any = await db.query(
    `
    SELECT k.id
    FROM keywords k
    LEFT JOIN production_runs pr
      ON pr.keyword_id = k.id
      AND pr.status IN ('queued', 'running')
    WHERE k.site_id = ?
      AND k.status = 'approved'
      AND pr.id IS NULL
    ORDER BY
      k.opportunity_score DESC,
      k.search_volume DESC,
      k.created_at ASC
    LIMIT ?
    `,
    [input.siteId, input.limit]
  );

  return rows.map((row: any) => String(row.id));
}

export async function getAutomationQueueStats(siteId: string) {
  const [[active]]: any = await db.query(
    `
    SELECT
      SUM(status = 'queued') AS queued,
      SUM(status = 'running') AS running
    FROM production_runs
    WHERE site_id = ?
      AND status IN ('queued', 'running')
    `,
    [siteId]
  );

  const [[today]]: any = await db.query(
    `
    SELECT COUNT(*) AS queued_today
    FROM production_runs
    WHERE site_id = ?
      AND keyword_id IS NOT NULL
      AND created_at >= CURRENT_DATE
    `,
    [siteId]
  );

  const queued = Number(active?.queued ?? 0);
  const running = Number(active?.running ?? 0);

  return {
    queued,
    running,
    active: queued + running,
    queuedToday: Number(today?.queued_today ?? 0),
  };
}

export async function getAutomationProductionSummary(siteId: string) {
  const [[site]]: any = await db.query(
    `
    SELECT id, site_name, domain
    FROM sites
    WHERE id = ?
    LIMIT 1
    `,
    [siteId]
  );

  const [[production]]: any = await db.query(
    `
    SELECT
      COUNT(*) AS total,
      SUM(status = 'queued') AS queued,
      SUM(status = 'running') AS running,
      SUM(status = 'completed') AS completed,
      SUM(status = 'failed') AS failed
    FROM production_runs
    WHERE site_id = ?
    `,
    [siteId]
  );

  const [[keywords]]: any = await db.query(
    `
    SELECT
      COUNT(*) AS total,
      SUM(status = 'approved') AS approved,
      SUM(status = 'planned') AS planned,
      SUM(status = 'used') AS used
    FROM keywords
    WHERE site_id = ?
    `,
    [siteId]
  );

  const [recentFailures]: any = await db.query(
    `
    SELECT
      pr.id,
      pr.keyword_id,
      pr.article_id,
      pr.error_message,
      pr.finished_at,
      k.keyword,
      a.title AS article_title
    FROM production_runs pr
    LEFT JOIN keywords k
      ON k.id = pr.keyword_id
    LEFT JOIN articles a
      ON a.id = pr.article_id
    WHERE pr.site_id = ?
      AND pr.status = 'failed'
    ORDER BY pr.finished_at DESC, pr.created_at DESC
    LIMIT 10
    `,
    [siteId]
  );

  const [recentCompleted]: any = await db.query(
    `
    SELECT
      pr.id,
      pr.keyword_id,
      pr.article_id,
      pr.finished_at,
      k.keyword,
      a.title AS article_title,
      a.wordpress_draft_url
    FROM production_runs pr
    LEFT JOIN keywords k
      ON k.id = pr.keyword_id
    LEFT JOIN articles a
      ON a.id = pr.article_id
    WHERE pr.site_id = ?
      AND pr.status = 'completed'
    ORDER BY pr.finished_at DESC, pr.created_at DESC
    LIMIT 10
    `,
    [siteId]
  );

  const [[editorial]]: any = await db.query(
    `
    SELECT
      SUM(status IN ('wordpress_draft', 'human_review')) AS review_required,
      SUM(status = 'approved') AS ready_to_publish,
      SUM(status = 'published'
        AND publish_date = CURRENT_DATE) AS published_today
    FROM articles
    WHERE site_id = ?
    `,
    [siteId]
  );

  return {
    generatedAt: new Date().toISOString(),
    site: site
      ? {
          id: site.id,
          name: site.site_name,
          domain: site.domain,
        }
      : null,
    production: {
      total: Number(production?.total ?? 0),
      queued: Number(production?.queued ?? 0),
      running: Number(production?.running ?? 0),
      completed: Number(production?.completed ?? 0),
      failed: Number(production?.failed ?? 0),
    },
    keywords: {
      total: Number(keywords?.total ?? 0),
      approved: Number(keywords?.approved ?? 0),
      planned: Number(keywords?.planned ?? 0),
      used: Number(keywords?.used ?? 0),
    },
    editorial: {
      reviewRequired: Number(editorial?.review_required ?? 0),
      readyToPublish: Number(editorial?.ready_to_publish ?? 0),
      publishedToday: Number(editorial?.published_today ?? 0),
    },
    recentFailures,
    recentCompleted,
  };
}
