import { randomUUID } from "crypto";
import { db } from "@/lib/db";

export async function createProductionRun(articleId: string) {
  const [articleRows]: any = await db.query(
    `
    SELECT site_id
    FROM articles
    WHERE id = ?
    LIMIT 1
    `,
    [articleId]
  );

  if (!articleRows.length) {
    throw new Error("Article not found.");
  }

  const siteId = articleRows[0].site_id;
  const productionRunId = randomUUID();

  await db.query(
    `
    INSERT INTO production_runs
    (
      id,
      site_id,
      article_id,
      status,
      progress_percent,
      started_at
    )
    VALUES (?, ?, ?, 'queued', 0, NOW())
    `,
    [productionRunId, siteId, articleId]
  );

  const [steps]: any = await db.query(`
    SELECT code, name, step_order
    FROM production_steps
    WHERE enabled = TRUE
    ORDER BY step_order
  `);

  for (const step of steps) {
    await db.query(
      `
      INSERT INTO production_run_steps
      (
        id,
        production_run_id,
        step_code,
        step_name,
        step_order,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'queued')
      `,
      [
        randomUUID(),
        productionRunId,
        step.code,
        step.name,
        step.step_order,
      ]
    );
  }

  return productionRunId;
}