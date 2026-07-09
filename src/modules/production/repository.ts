import { db } from "@/lib/db";

export async function getProductionRuns() {
  const [rows]: any = await db.query(`
    SELECT
      pr.*,
      a.title AS article_title
    FROM production_runs pr
    LEFT JOIN articles a ON a.id = pr.article_id
    ORDER BY pr.created_at DESC
    LIMIT 100
  `);

  return rows;
}

export async function getProductionRun(runId: string) {
  const [rows]: any = await db.query(
    `
    SELECT
      pr.*,
      a.title AS article_title
    FROM production_runs pr
    LEFT JOIN articles a ON a.id = pr.article_id
    WHERE pr.id = ?
    LIMIT 1
    `,
    [runId]
  );

  return rows[0] ?? null;
}

export async function getProductionRunSteps(runId: string) {
  const [rows]: any = await db.query(
    `
    SELECT *
    FROM production_run_steps
    WHERE production_run_id = ?
    ORDER BY step_order ASC
    `,
    [runId]
  );

  return rows;
}