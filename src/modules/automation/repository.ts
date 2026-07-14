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

export async function getAutomationProductionSummary(siteId: string) {
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

  return {
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
    recentFailures,
  };
}
