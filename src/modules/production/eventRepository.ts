import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

export type ProductionEventInput = {
  productionRunId: string;
  eventType: string;
  message: string;
  stepCode?: string | null;
  status?: string | null;
  details?: Record<string, unknown> | null;
};

export async function addProductionEvent(
  input: ProductionEventInput
) {
  await db.query(
    `
    INSERT INTO production_run_events (
      id,
      production_run_id,
      step_code,
      event_type,
      status,
      message,
      details_json,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      randomUUID(),
      input.productionRunId,
      input.stepCode ?? null,
      input.eventType,
      input.status ?? null,
      input.message,
      input.details
        ? JSON.stringify(input.details)
        : null,
    ]
  );
}

export async function getProductionRunEvents(
  productionRunId: string
) {
  const [rows]: any = await db.query(
    `
    SELECT
      id,
      production_run_id,
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
    [productionRunId]
  );

  return rows;
}