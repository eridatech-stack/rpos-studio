import { db } from "@/lib/db";

export async function getPromptVersions() {
  const [prompts]: any = await db.query(`
    SELECT
      pv.id,
      pv.prompt_key,
      pv.name,
      pv.model,
      pv.temperature,
      pv.output_format,
      pv.version,
      pv.active,
      pv.created_at,
      s.site_name
    FROM prompt_versions pv
    LEFT JOIN sites s ON s.id = pv.site_id
    ORDER BY pv.prompt_key ASC, pv.created_at DESC
  `);

  return prompts;
}

export async function getPromptPerformance() {
  const [rows]: any = await db.query(`
    SELECT
      JSON_UNQUOTE(JSON_EXTRACT(j.output_data, '$.prompt.id')) AS prompt_id,
      JSON_UNQUOTE(JSON_EXTRACT(j.output_data, '$.prompt.key')) AS prompt_key,
      JSON_UNQUOTE(JSON_EXTRACT(j.output_data, '$.prompt.name')) AS prompt_name,
      JSON_UNQUOTE(JSON_EXTRACT(j.output_data, '$.prompt.version')) AS prompt_version,
      JSON_UNQUOTE(JSON_EXTRACT(j.output_data, '$.prompt.model')) AS model,
      COUNT(*) AS total_runs,
      SUM(j.status = 'completed') AS completed_runs,
      SUM(j.status = 'failed') AS failed_runs,
      AVG(
        CASE
          WHEN j.started_at IS NOT NULL
            AND j.finished_at IS NOT NULL
          THEN TIMESTAMPDIFF(SECOND, j.started_at, j.finished_at)
        END
      ) AS avg_duration_seconds,
      SUM(
        CAST(
          JSON_UNQUOTE(
            JSON_EXTRACT(j.output_data, '$.aiUsage.promptTokens')
          ) AS UNSIGNED
        )
      ) AS input_tokens,
      SUM(
        CAST(
          JSON_UNQUOTE(
            JSON_EXTRACT(j.output_data, '$.aiUsage.completionTokens')
          ) AS UNSIGNED
        )
      ) AS output_tokens,
      SUM(
        CAST(
          JSON_UNQUOTE(
            JSON_EXTRACT(j.output_data, '$.aiUsage.estimatedCostUsd')
          ) AS DECIMAL(12, 6)
        )
      ) AS estimated_cost
    FROM jobs j
    WHERE j.output_data IS NOT NULL
      AND JSON_EXTRACT(j.output_data, '$.prompt.id') IS NOT NULL
    GROUP BY
      prompt_id,
      prompt_key,
      prompt_name,
      prompt_version,
      model
    ORDER BY total_runs DESC, estimated_cost DESC
  `);

  return rows.map((row: any) => ({
    promptId: row.prompt_id,
    promptKey: row.prompt_key,
    promptName: row.prompt_name,
    promptVersion: row.prompt_version,
    model: row.model,
    totalRuns: Number(row.total_runs ?? 0),
    completedRuns: Number(row.completed_runs ?? 0),
    failedRuns: Number(row.failed_runs ?? 0),
    averageDurationSeconds:
      row.avg_duration_seconds === null
        ? null
        : Number(row.avg_duration_seconds ?? 0),
    inputTokens: Number(row.input_tokens ?? 0),
    outputTokens: Number(row.output_tokens ?? 0),
    estimatedCost: Number(row.estimated_cost ?? 0),
  }));
}

export async function getPromptVersionById(id: string) {
  const [rows]: any = await db.query(
    `
    SELECT
      pv.id,
      pv.prompt_key,
      pv.name,
      pv.prompt_text,
      pv.model,
      pv.temperature,
      pv.output_format,
      pv.version,
      pv.active,
      pv.created_at,
      s.site_name
    FROM prompt_versions pv
    LEFT JOIN sites s ON s.id = pv.site_id
    WHERE pv.id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}
