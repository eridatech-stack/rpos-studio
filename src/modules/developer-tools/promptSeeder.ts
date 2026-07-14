import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

const featuredImagePrompt = `Create a realistic editorial featured image for a WordPress article.

The image should look like professional magazine photography, not an illustration.

Article title: {{title}}
Primary keyword: {{keyword}}
Category: {{category}}
Topic cluster: {{cluster}}
Summary: {{meta_description}}

Requirements:
- natural photographic realism
- believable lighting and real-world textures
- clean composition with one clear subject
- suitable as a 3:2 WordPress featured image
- no visible words, captions, signs, UI, logos, brand marks, or watermarks
- avoid cartoon, 3D render, vector art, flat illustration, poster art, and surreal imagery`;

export async function seedFeaturedImagePrompt(
  siteDomain = "https://rithm.info"
) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [siteRows]: any = await connection.query(
      `
      SELECT id
      FROM sites
      WHERE domain = ?
      LIMIT 1
      `,
      [siteDomain]
    );

    if (!siteRows.length) {
      throw new Error(`Site not found: ${siteDomain}`);
    }

    const siteId = siteRows[0].id;

    await connection.query(
      `
      UPDATE prompt_versions
      SET active = FALSE
      WHERE site_id = ?
        AND prompt_key = 'featured_image'
      `,
      [siteId]
    );

    const [existingRows]: any = await connection.query(
      `
      SELECT id
      FROM prompt_versions
      WHERE site_id = ?
        AND prompt_key = 'featured_image'
        AND version = '1.0'
      LIMIT 1
      `,
      [siteId]
    );

    if (existingRows.length > 0) {
      await connection.query(
        `
        UPDATE prompt_versions
        SET
          name = 'Featured Image Prompt',
          prompt_text = ?,
          model = 'gpt-4.1-mini',
          temperature = 0.40,
          output_format = 'plain_text',
          active = TRUE
        WHERE id = ?
        `,
        [featuredImagePrompt, existingRows[0].id]
      );

      await connection.commit();

      return {
        inserted: 0,
        updated: 1,
        promptId: existingRows[0].id,
      };
    }

    const promptId = randomUUID();

    await connection.query(
      `
      INSERT INTO prompt_versions (
        id,
        site_id,
        prompt_key,
        name,
        prompt_text,
        model,
        temperature,
        output_format,
        version,
        active,
        created_at
      )
      VALUES (?, ?, 'featured_image', 'Featured Image Prompt', ?, 'gpt-4.1-mini', 0.40, 'plain_text', '1.0', TRUE, NOW())
      `,
      [promptId, siteId, featuredImagePrompt]
    );

    await connection.commit();

    return {
      inserted: 1,
      updated: 0,
      promptId,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
