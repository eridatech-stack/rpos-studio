import { db } from "@/lib/db";

export async function getSites() {
  const [rows]: any = await db.query(`
    SELECT
      id,
      site_name,
      domain,
      status
    FROM sites
    WHERE status = 'active'
    ORDER BY site_name ASC
  `);

  return rows;
}

export async function getDashboardStats(siteId: string) {
  const [[keywords]]: any = await db.query(
    `
    SELECT
      COUNT(*) AS total,
      SUM(status = 'approved') AS approved,
      SUM(status = 'planned') AS planned
    FROM keywords
    WHERE site_id = ?
    `,
    [siteId]
  );

  const [[articles]]: any = await db.query(
    `
    SELECT
      COUNT(*) AS total,
      SUM(status = 'wordpress_draft') AS review_required,
      SUM(status = 'approved') AS ready_to_publish,
      SUM(status = 'published') AS published_total,
      SUM(
        status = 'published'
        AND publish_date = CURRENT_DATE
      ) AS published_today
    FROM articles
    WHERE site_id = ?
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

  const [[productionHealth]]: any = await db.query(
    `
    SELECT
      COUNT(DISTINCT CASE
        WHEN status = 'running'
          AND worker_id IS NOT NULL
        THEN worker_id
      END) AS active_workers,
      SUM(
        status = 'running'
        AND locked_at IS NOT NULL
        AND locked_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
      ) AS stale_running,
      MAX(
        COALESCE(
          locked_at,
          started_at,
          finished_at,
          created_at
        )
      ) AS last_activity_at,
      AVG(CASE
        WHEN status = 'completed'
          AND started_at IS NOT NULL
          AND finished_at IS NOT NULL
        THEN TIMESTAMPDIFF(SECOND, started_at, finished_at)
      END) AS avg_completed_seconds
    FROM production_runs
    WHERE site_id = ?
    `,
    [siteId]
  );

  const [[aiCost]]: any = await db.query(
    `
    SELECT
      SUM(
        CASE
          WHEN finished_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
          THEN CAST(
            JSON_UNQUOTE(
              JSON_EXTRACT(output_data, '$.aiUsage.estimatedCostUsd')
            ) AS DECIMAL(12, 6)
          )
          ELSE 0
        END
      ) AS current_month_cost,
      SUM(
        CAST(
          JSON_UNQUOTE(
            JSON_EXTRACT(output_data, '$.aiUsage.estimatedCostUsd')
          ) AS DECIMAL(12, 6)
        )
      ) AS total_cost
    FROM jobs
    WHERE site_id = ?
      AND status = 'completed'
      AND output_data IS NOT NULL
      AND JSON_EXTRACT(output_data, '$.aiUsage.estimatedCostUsd') IS NOT NULL
    `,
    [siteId]
  );

  const [recentWorkers]: any = await db.query(
    `
    SELECT
      worker_id,
      SUM(status = 'running') AS running_runs,
      MAX(
        COALESCE(
          locked_at,
          started_at,
          finished_at,
          created_at
        )
      ) AS last_activity_at
    FROM production_runs
    WHERE site_id = ?
      AND worker_id IS NOT NULL
    GROUP BY worker_id
    ORDER BY last_activity_at DESC
    LIMIT 4
    `,
    [siteId]
  );

  const [recentRuns]: any = await db.query(
    `
    SELECT
      pr.id,
      pr.status,
      pr.current_step,
      pr.progress_percent,
      pr.error_message,
      pr.created_at,
      pr.started_at,
      pr.finished_at,
      TIMESTAMPDIFF(
        SECOND,
        pr.started_at,
        COALESCE(pr.finished_at, NOW())
      ) AS duration_seconds,
      k.keyword,
      a.title AS article_title
    FROM production_runs pr
    LEFT JOIN keywords k
      ON k.id = pr.keyword_id
    LEFT JOIN articles a
      ON a.id = pr.article_id
    WHERE pr.site_id = ?
    ORDER BY pr.created_at DESC
    LIMIT 8
    `,
    [siteId]
  );

  const [recentPublished]: any = await db.query(
    `
    SELECT
      id,
      title,
      published_url,
      publish_date,
      updated_at
    FROM articles
    WHERE site_id = ?
      AND status = 'published'
    ORDER BY
      publish_date DESC,
      updated_at DESC
    LIMIT 6
    `,
    [siteId]
  );

  return {
    keywords: {
      total: Number(keywords?.total ?? 0),
      approved: Number(keywords?.approved ?? 0),
      planned: Number(keywords?.planned ?? 0),
    },

    articles: {
      total: Number(articles?.total ?? 0),
      reviewRequired: Number(
        articles?.review_required ?? 0
      ),
      readyToPublish: Number(
        articles?.ready_to_publish ?? 0
      ),
      publishedTotal: Number(
        articles?.published_total ?? 0
      ),
      publishedToday: Number(
        articles?.published_today ?? 0
      ),
    },

    production: {
      total: Number(production?.total ?? 0),
      queued: Number(production?.queued ?? 0),
      running: Number(production?.running ?? 0),
      completed: Number(production?.completed ?? 0),
      failed: Number(production?.failed ?? 0),
    },

    productionHealth: {
      activeWorkers: Number(productionHealth?.active_workers ?? 0),
      staleRunning: Number(productionHealth?.stale_running ?? 0),
      lastActivityAt: productionHealth?.last_activity_at ?? null,
      averageCompletedSeconds:
        productionHealth?.avg_completed_seconds === null
          ? null
          : Number(productionHealth?.avg_completed_seconds ?? 0),
      recentWorkers,
    },

    aiCost: {
      currentMonth: Number(aiCost?.current_month_cost ?? 0),
      total: Number(aiCost?.total_cost ?? 0),
    },

    recentRuns,
    recentPublished,
  };
}
