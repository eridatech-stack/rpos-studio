import { db } from "@/lib/db";
import type {
  ProductionRun,
  ProductionRunEvent,
  ProductionRunStep,
} from "@/modules/production/types";

export async function getProductionRuns(): Promise<ProductionRun[]> {
  const [rows]: any = await db.query(`
    SELECT
      pr.*,
      a.title AS article_title,
      k.keyword,
      s.site_name,
      s.domain
    FROM production_runs pr
    LEFT JOIN articles a ON a.id = pr.article_id
    LEFT JOIN keywords k ON k.id = pr.keyword_id
    LEFT JOIN sites s ON s.id = pr.site_id
    ORDER BY pr.created_at DESC
    LIMIT 100
  `);

  return rows;
}

export async function getProductionRun(
  runId: string
): Promise<ProductionRun | null> {
  const [rows]: any = await db.query(
    `
    SELECT
      pr.*,
      a.title AS article_title,
      k.keyword,
      s.site_name,
      s.domain
    FROM production_runs pr
    LEFT JOIN articles a ON a.id = pr.article_id
    LEFT JOIN keywords k ON k.id = pr.keyword_id
    LEFT JOIN sites s ON s.id = pr.site_id
    WHERE pr.id = ?
    LIMIT 1
    `,
    [runId]
  );

  return rows[0] ?? null;
}

export async function getProductionRunSteps(
  runId: string
): Promise<ProductionRunStep[]> {
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

export async function getProductionRunEvents(
  runId: string
): Promise<ProductionRunEvent[]> {
  const [rows]: any = await db.query(
    `
    SELECT
      id,
      step_code,
      event_type,
      status,
      message,
      details_json,
      created_at
    FROM production_run_events
    WHERE production_run_id = ?
    ORDER BY created_at ASC, id ASC
    `,
    [runId]
  );

  return rows;
}
