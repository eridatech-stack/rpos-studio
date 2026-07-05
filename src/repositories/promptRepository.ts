import { db } from "@/lib/db";

export async function getActivePrompt(siteId: string, promptKey: string) {
  const [rows]: any = await db.query(
    `
    SELECT *
    FROM prompt_versions
    WHERE site_id = ?
      AND prompt_key = ?
      AND active = TRUE
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [siteId, promptKey]
  );

  return rows[0] || null;
}