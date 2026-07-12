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

    recentRuns,
    recentPublished,
  };
}