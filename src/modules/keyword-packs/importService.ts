import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { addKeywordPackEvent } from "@/modules/keyword-packs/repository";

export type KeywordPackImportStatus = "needs_review" | "approved";

export type KeywordPackImportResult = {
  categoriesCreated: number;
  clustersCreated: number;
  keywordsCreated: number;
  keywordsSkipped: number;
  duplicatesFound: number;
  failures: Array<{
    itemId: string;
    keyword: string;
    message: string;
  }>;
};

export async function importApprovedKeywordPack(input: {
  keywordPackId: string;
  keywordStatus: KeywordPackImportStatus;
}): Promise<KeywordPackImportResult> {
  const connection = await db.getConnection();
  const result: KeywordPackImportResult = {
    categoriesCreated: 0,
    clustersCreated: 0,
    keywordsCreated: 0,
    keywordsSkipped: 0,
    duplicatesFound: 0,
    failures: [],
  };

  try {
    await connection.beginTransaction();

    const [packRows]: any = await connection.query(
      `
      SELECT id, site_id, status
      FROM keyword_packs
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [input.keywordPackId]
    );

    const pack = packRows[0];

    if (!pack) {
      throw new Error("Keyword pack not found.");
    }

    if (!["ready_for_review", "completed"].includes(pack.status)) {
      throw new Error(
        "Only keyword packs ready for review can be imported."
      );
    }

    await connection.query(
      `
      UPDATE keyword_packs
      SET status = 'importing', updated_at = NOW()
      WHERE id = ?
      `,
      [input.keywordPackId]
    );

    const [categoryRows]: any = await connection.query(
      `
      SELECT *
      FROM keyword_pack_categories
      WHERE keyword_pack_id = ?
      ORDER BY sort_order ASC
      `,
      [input.keywordPackId]
    );

    const categoryIdByPackCategory = new Map<string, string>();

    for (const category of categoryRows) {
      const liveCategoryId = await findOrCreateCategory({
        connection,
        siteId: pack.site_id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        priority: category.priority || "medium",
      });

      if (liveCategoryId.created) {
        result.categoriesCreated += 1;
      }

      categoryIdByPackCategory.set(category.id, liveCategoryId.id);
    }

    const [clusterRows]: any = await connection.query(
      `
      SELECT *
      FROM keyword_pack_clusters
      WHERE keyword_pack_id = ?
      ORDER BY sort_order ASC
      `,
      [input.keywordPackId]
    );

    const clusterIdByPackCluster = new Map<string, string>();

    for (const cluster of clusterRows) {
      const liveCategoryId =
        categoryIdByPackCategory.get(cluster.category_id);

      if (!liveCategoryId) {
        continue;
      }

      const liveClusterId = await findOrCreateCluster({
        connection,
        siteId: pack.site_id,
        categoryId: liveCategoryId,
        name: cluster.name,
        slug: cluster.slug,
        notes: cluster.description,
      });

      if (liveClusterId.created) {
        result.clustersCreated += 1;
      }

      clusterIdByPackCluster.set(cluster.id, liveClusterId.id);
    }

    const [itemRows]: any = await connection.query(
      `
      SELECT *
      FROM keyword_pack_items
      WHERE keyword_pack_id = ?
        AND review_status = 'approved'
      ORDER BY is_pillar DESC, ai_opportunity_score DESC
      FOR UPDATE
      `,
      [input.keywordPackId]
    );

    for (const item of itemRows) {
      try {
        const liveCategoryId =
          categoryIdByPackCategory.get(item.category_id);
        const liveClusterId =
          clusterIdByPackCluster.get(item.cluster_id);

        if (!liveCategoryId || !liveClusterId) {
          throw new Error("Missing category or cluster mapping.");
        }

        const [existingRows]: any = await connection.query(
          `
          SELECT id
          FROM keywords
          WHERE site_id = ?
            AND keyword = ?
          LIMIT 1
          `,
          [pack.site_id, item.keyword]
        );

        if (existingRows.length > 0) {
          await connection.query(
            `
            UPDATE keyword_pack_items
            SET
              review_status = 'duplicate',
              existing_keyword_id = ?,
              updated_at = NOW()
            WHERE id = ?
            `,
            [existingRows[0].id, item.id]
          );

          result.duplicatesFound += 1;
          result.keywordsSkipped += 1;
          continue;
        }

        const keywordId = randomUUID();

        await connection.query(
          `
          INSERT INTO keywords (
            id,
            site_id,
            category_id,
            cluster_id,
            keyword,
            intent,
            search_volume,
            difficulty,
            cpc,
            opportunity_score,
            priority,
            status,
            related_keywords,
            notes,
            article_type,
            content_stage,
            created_by,
            created_at,
            updated_at
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?,
            ?, ?, ?, 'keyword', 'ai', NOW(), NOW()
          )
          `,
          [
            keywordId,
            pack.site_id,
            liveCategoryId,
            liveClusterId,
            item.keyword,
            item.intent,
            item.estimated_search_volume ?? 0,
            item.estimated_difficulty,
            item.ai_opportunity_score,
            item.priority,
            input.keywordStatus,
            serializeJsonField(item.related_item_ids_json),
            item.notes,
            item.article_type,
          ]
        );

        await connection.query(
          `
          UPDATE keyword_pack_items
          SET
            review_status = 'imported',
            existing_keyword_id = ?,
            updated_at = NOW()
          WHERE id = ?
          `,
          [keywordId, item.id]
        );

        result.keywordsCreated += 1;
      } catch (error) {
        result.failures.push({
          itemId: item.id,
          keyword: item.keyword,
          message:
            error instanceof Error
              ? error.message
              : "Unable to import keyword.",
        });
      }
    }

    await connection.query(
      `
      UPDATE keyword_packs
      SET
        status = 'completed',
        current_step = NULL,
        progress_percent = 100,
        finished_at = COALESCE(finished_at, NOW()),
        updated_at = NOW()
      WHERE id = ?
      `,
      [input.keywordPackId]
    );

    await connection.commit();

    await addKeywordPackEvent({
      keywordPackId: input.keywordPackId,
      eventType: "pack_imported",
      status: "completed",
      message: "Approved keyword pack items imported.",
      details: result,
    });

    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function serializeJsonField(value: unknown) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : JSON.stringify(value);
}

async function findOrCreateCategory(input: {
  connection: any;
  siteId: string;
  name: string;
  slug: string;
  description: string | null;
  priority: string;
}) {
  const [rows]: any = await input.connection.query(
    `
    SELECT id
    FROM categories
    WHERE site_id = ?
      AND slug = ?
    LIMIT 1
    `,
    [input.siteId, input.slug]
  );

  if (rows.length > 0) {
    return {
      id: rows[0].id,
      created: false,
    };
  }

  const id = randomUUID();

  await input.connection.query(
    `
    INSERT INTO categories (
      id,
      site_id,
      name,
      slug,
      description,
      priority,
      status,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())
    `,
    [
      id,
      input.siteId,
      input.name,
      input.slug,
      input.description,
      input.priority,
    ]
  );

  return {
    id,
    created: true,
  };
}

async function findOrCreateCluster(input: {
  connection: any;
  siteId: string;
  categoryId: string;
  name: string;
  slug: string;
  notes: string | null;
}) {
  const [rows]: any = await input.connection.query(
    `
    SELECT id
    FROM topic_clusters
    WHERE site_id = ?
      AND slug = ?
    LIMIT 1
    `,
    [input.siteId, input.slug]
  );

  if (rows.length > 0) {
    return {
      id: rows[0].id,
      created: false,
    };
  }

  const id = randomUUID();

  await input.connection.query(
    `
    INSERT INTO topic_clusters (
      id,
      site_id,
      category_id,
      name,
      slug,
      status,
      notes,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, 'planned', ?, NOW())
    `,
    [
      id,
      input.siteId,
      input.categoryId,
      input.name,
      input.slug,
      input.notes,
    ]
  );

  return {
    id,
    created: true,
  };
}
