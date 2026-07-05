import { db } from "@/lib/db";

export async function createJob(input: {
  siteId: string;
  jobType: string;
  relatedKeywordId?: string;
  relatedArticleId?: string;
  inputData?: unknown;
}) {
  const [result]: any = await db.query(
    `
    INSERT INTO jobs (
      site_id,
      job_type,
      status,
      related_keyword_id,
      related_article_id,
      input_data,
      started_at
    )
    VALUES (?, ?, 'running', ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [
      input.siteId,
      input.jobType,
      input.relatedKeywordId || null,
      input.relatedArticleId || null,
      JSON.stringify(input.inputData || {}),
    ]
  );

  const [rows]: any = await db.query(
    `
    SELECT id FROM jobs
    WHERE site_id = ?
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [input.siteId]
  );

  return rows[0]?.id;
}

export async function completeJob(jobId: string, outputData?: unknown) {
  await db.query(
    `
    UPDATE jobs
    SET status = 'completed',
        output_data = ?,
        finished_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [JSON.stringify(outputData || {}), jobId]
  );
}

export async function failJob(jobId: string, errorMessage: string) {
  await db.query(
    `
    UPDATE jobs
    SET status = 'failed',
        error_message = ?,
        finished_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [errorMessage, jobId]
  );
}