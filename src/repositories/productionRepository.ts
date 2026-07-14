import { db } from "@/lib/db";

export async function getProductionQueue() {
  const [[summary]]: any = await db.query(`
    SELECT
      COUNT(*) AS total,
      SUM(status = 'queued') AS queued,
      SUM(status = 'running') AS running,
      SUM(status = 'completed') AS completed,
      SUM(status = 'failed') AS failed
    FROM production_runs
  `);

  const [approvedKeywords]: any = await db.query(`
    SELECT
      k.id,
      k.keyword,
      k.intent,
      k.priority,
      k.opportunity_score,
      k.search_volume,
      k.difficulty,
      c.name AS category,
      tc.name AS cluster
    FROM keywords k
    LEFT JOIN categories c
      ON c.id = k.category_id
    LEFT JOIN topic_clusters tc
      ON tc.id = k.cluster_id
    WHERE k.status = 'approved'
    ORDER BY
      k.opportunity_score DESC,
      k.search_volume DESC,
      k.created_at ASC
    LIMIT 100
  `);

  const [activeRuns]: any = await db.query(`
    SELECT
      pr.id,
      pr.keyword_id,
      pr.article_id,
      pr.status,
      pr.current_step,
      pr.progress_percent,
      pr.worker_id,
      pr.attempt_count,
      pr.started_at,
      pr.created_at,
      k.keyword,
      a.title AS article_title
    FROM production_runs pr
    LEFT JOIN keywords k
      ON k.id = pr.keyword_id
    LEFT JOIN articles a
      ON a.id = pr.article_id
    WHERE pr.status IN ('queued', 'running')
    ORDER BY
      FIELD(pr.status, 'running', 'queued'),
      pr.created_at ASC
    LIMIT 50
  `);

  const [failedRuns]: any = await db.query(`
    SELECT
      pr.id,
      pr.keyword_id,
      pr.article_id,
      pr.status,
      pr.current_step,
      pr.progress_percent,
      pr.attempt_count,
      pr.error_message,
      pr.started_at,
      pr.finished_at,
      pr.created_at,
      k.keyword,
      a.title AS article_title
    FROM production_runs pr
    LEFT JOIN keywords k
      ON k.id = pr.keyword_id
    LEFT JOIN articles a
      ON a.id = pr.article_id
    WHERE pr.status = 'failed'
    ORDER BY pr.finished_at DESC, pr.created_at DESC
    LIMIT 25
  `);

  return {
    summary: {
      total: Number(summary?.total ?? 0),
      queued: Number(summary?.queued ?? 0),
      running: Number(summary?.running ?? 0),
      completed: Number(summary?.completed ?? 0),
      failed: Number(summary?.failed ?? 0),
    },
    approvedKeywords,
    activeRuns,
    failedRuns,
  };
}

export async function getAllJobs() {
  const [jobs]: any = await db.query(`
    SELECT
      j.id,
      j.job_type,
      j.status,
      j.output_data,
      j.error_message,
      j.started_at,
      j.finished_at,
      j.created_at,
      a.title AS article_title,
      k.keyword
    FROM jobs j
    LEFT JOIN articles a
      ON a.id = j.related_article_id
    LEFT JOIN keywords k
      ON k.id = j.related_keyword_id
    ORDER BY j.created_at DESC
    LIMIT 100
  `);

  return jobs;
}
