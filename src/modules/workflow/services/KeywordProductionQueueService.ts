import { randomUUID } from "crypto";
import { db } from "@/lib/db";

const keywordProductionSteps = [
  {
    code: "outline",
    name: "Generate Outline",
    order: 10,
  },
  {
    code: "draft",
    name: "Generate Draft",
    order: 20,
  },
  {
    code: "wordpress_draft",
    name: "Create WordPress Draft",
    order: 30,
  },
];

export async function enqueueKeywordProduction(keywordId: string) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [keywordRows]: any = await connection.query(
      `
      SELECT id, site_id, status
      FROM keywords
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [keywordId]
    );

    const keyword = keywordRows[0];

    if (!keyword) {
      throw new Error("Keyword not found.");
    }

    if (keyword.status !== "approved") {
      throw new Error(
        "Only approved keywords can be added to production."
      );
    }

    const [existingRows]: any = await connection.query(
      `
      SELECT id
      FROM production_runs
      WHERE keyword_id = ?
        AND status IN ('queued', 'running')
      LIMIT 1
      `,
      [keywordId]
    );

    if (existingRows.length > 0) {
      throw new Error(
        "This keyword already has an active production run."
      );
    }

    const productionRunId = randomUUID();

    await connection.query(
      `
      INSERT INTO production_runs (
        id,
        site_id,
        keyword_id,
        article_id,
        status,
        current_step,
        progress_percent,
        attempt_count,
        created_at
      )
      VALUES (?, ?, ?, NULL, 'queued', NULL, 0, 0, NOW())
      `,
      [
        productionRunId,
        keyword.site_id,
        keyword.id,
      ]
    );

    for (const step of keywordProductionSteps) {
      await connection.query(
        `
        INSERT INTO production_run_steps (
          id,
          production_run_id,
          step_code,
          step_name,
          status,
          step_order,
          created_at
        )
        VALUES (?, ?, ?, ?, 'queued', ?, NOW())
        `,
        [
          randomUUID(),
          productionRunId,
          step.code,
          step.name,
          step.order,
        ]
      );
    }

    await connection.commit();

    return {
      productionRunId,
      status: "queued",
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}