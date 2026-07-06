import { db } from "@/lib/db";

export async function getDashboardStats() {
  const [[keywords]]: any = await db.query(`
    SELECT
      COUNT(*) AS total,
      SUM(status = 'approved') AS approved,
      SUM(status = 'planned') AS planned
    FROM keywords
  `);

  const [[articles]]: any = await db.query(`
    SELECT
      COUNT(*) AS total,
      SUM(status = 'outline_ready') AS outline_ready,
      SUM(status = 'draft_ready') AS draft_ready,
      SUM(status = 'wordpress_draft') AS wordpress_draft,
      SUM(status = 'published') AS published
    FROM articles
  `);

  const [[jobs]]: any = await db.query(`
    SELECT
      COUNT(*) AS total,
      SUM(status = 'running') AS running,
      SUM(status = 'completed') AS completed,
      SUM(status = 'failed') AS failed
    FROM jobs
  `);

  const [recentJobs]: any = await db.query(`
    SELECT
      id,
      job_type,
      status,
      error_message,
      created_at,
      finished_at
    FROM jobs
    ORDER BY created_at DESC
    LIMIT 10
  `);

  return {
    keywords,
    articles,
    jobs,
    recentJobs,
  };
}