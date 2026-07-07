import { db } from "@/lib/db";

export async function getProductionQueue() {
  const [jobs]: any = await db.query(`
    SELECT
      j.id,
      j.job_type,
      j.status,
      j.error_message,
      j.started_at,
      j.finished_at,
      j.created_at,
      a.title AS article_title,
      a.status AS article_status,
      k.keyword
    FROM jobs j
    LEFT JOIN articles a ON a.id = j.related_article_id
    LEFT JOIN keywords k ON k.id = j.related_keyword_id
    ORDER BY j.created_at DESC
    LIMIT 50
  `);

  const [[summary]]: any = await db.query(`
    SELECT
      SUM(status = 'queued') AS queued,
      SUM(status = 'running') AS running,
      SUM(status = 'completed') AS completed,
      SUM(status = 'failed') AS failed,
      COUNT(*) AS total
    FROM jobs
  `);

  const [approvedKeywords]: any = await db.query(`
  SELECT
    k.id,
    k.keyword,
    k.intent,
    k.priority,
    k.opportunity_score,
    c.name AS category,
    tc.name AS cluster
  FROM keywords k
  LEFT JOIN categories c ON c.id = k.category_id
  LEFT JOIN topic_clusters tc ON tc.id = k.cluster_id
  WHERE k.status = 'approved'
  ORDER BY k.opportunity_score DESC
  LIMIT 10
`);

    const [outlineReadyArticles]: any = await db.query(`
    SELECT id, title, status, created_at
    FROM articles
    WHERE status = 'outline_ready'
    ORDER BY created_at DESC
    LIMIT 10
    `);

    const [draftReadyArticles]: any = await db.query(`
    SELECT id, title, status, created_at
    FROM articles
    WHERE status = 'draft_ready'
    ORDER BY created_at DESC
    LIMIT 10
    `);

 return {
  jobs,
  summary,
  approvedKeywords,
  outlineReadyArticles,
  draftReadyArticles,
};
}

export async function getAllJobs() {
  const [jobs]: any = await db.query(`
    SELECT
      j.id,
      j.job_type,
      j.status,
      j.error_message,
      j.started_at,
      j.finished_at,
      j.created_at,
      a.title AS article_title,
      k.keyword
    FROM jobs j
    LEFT JOIN articles a ON a.id = j.related_article_id
    LEFT JOIN keywords k ON k.id = j.related_keyword_id
    ORDER BY j.created_at DESC
    LIMIT 100
  `);

  return jobs;
}