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