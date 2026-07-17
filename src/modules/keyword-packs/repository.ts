import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type {
  KeywordPackCategoryDraft,
  KeywordPackClusterDraft,
  KeywordPackEventInput,
  KeywordPackInput,
  KeywordPackItemDraft,
  KeywordPackStatus,
  KeywordPackReviewStatus,
} from "@/modules/keyword-packs/types";

export type KeywordPackGenerationContext = {
  id: string;
  site_id: string;
  name: string;
  niche: string;
  target_language: string | null;
  target_countries: unknown;
  audience: string | null;
  business_goal: string | null;
  monetization_model: string | null;
  excluded_topics: string | null;
  preferred_categories: string | null;
  brand_notes: string | null;
  generation_mode: string;
  requested_keyword_count: number;
  status: KeywordPackStatus;
  site_name: string;
  domain: string;
  brand_voice: string | null;
  main_language: string | null;
  site_target_countries: unknown;
};

export type ClaimedKeywordPack = {
  id: string;
};

export async function createKeywordPackDraft(input: KeywordPackInput) {
  const keywordPackId = randomUUID();

  await db.query(
    `
    INSERT INTO keyword_packs (
      id,
      site_id,
      name,
      niche,
      target_language,
      target_countries,
      audience,
      business_goal,
      monetization_model,
      excluded_topics,
      preferred_categories,
      brand_notes,
      generation_mode,
      requested_keyword_count,
      status,
      progress_percent,
      created_by,
      created_at,
      updated_at
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, 'draft', 0, ?, NOW(), NOW()
    )
    `,
    [
      keywordPackId,
      input.siteId,
      input.name,
      input.niche,
      input.targetLanguage || null,
      JSON.stringify(input.targetCountries || []),
      input.audience || null,
      input.businessGoal || null,
      input.monetizationModel || null,
      input.excludedTopics || null,
      input.preferredCategories || null,
      input.brandNotes || null,
      input.generationMode,
      input.requestedKeywordCount,
      input.createdBy || null,
    ]
  );

  await addKeywordPackEvent({
    keywordPackId,
    eventType: "pack_created",
    status: "draft",
    message: "Keyword pack draft created.",
    details: {
      requestedKeywordCount: input.requestedKeywordCount,
      generationMode: input.generationMode,
    },
  });

  return keywordPackId;
}

export async function claimNextQueuedKeywordPack(
  workerId: string
): Promise<ClaimedKeywordPack | null> {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [rows]: any = await connection.query(
      `
      SELECT id
      FROM keyword_packs
      WHERE status = 'queued'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
      `
    );

    const pack = rows[0];

    if (!pack) {
      await connection.commit();
      return null;
    }

    await connection.query(
      `
      UPDATE keyword_packs
      SET
        status = 'running',
        current_step = 'claim',
        progress_percent = 1,
        started_at = COALESCE(started_at, NOW()),
        error_message = NULL,
        updated_at = NOW()
      WHERE id = ?
      `,
      [pack.id]
    );

    await connection.commit();

    await addKeywordPackEvent({
      keywordPackId: pack.id,
      eventType: "worker_claimed",
      status: "running",
      message: "Keyword pack worker claimed the job.",
      details: {
        workerId,
      },
    });

    return {
      id: pack.id,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getKeywordPackGenerationContext(
  keywordPackId: string
): Promise<KeywordPackGenerationContext | null> {
  const [rows]: any = await db.query(
    `
    SELECT
      kp.*,
      s.site_name,
      s.domain,
      s.brand_voice,
      s.main_language,
      s.target_countries AS site_target_countries
    FROM keyword_packs kp
    INNER JOIN sites s ON s.id = kp.site_id
    WHERE kp.id = ?
    LIMIT 1
    `,
    [keywordPackId]
  );

  return rows[0] || null;
}

export async function getKeywordPackStatus(keywordPackId: string) {
  const [rows]: any = await db.query(
    `
    SELECT status
    FROM keyword_packs
    WHERE id = ?
    LIMIT 1
    `,
    [keywordPackId]
  );

  return rows[0]?.status as KeywordPackStatus | undefined;
}

export async function getKeywordPackById(keywordPackId: string) {
  const [rows]: any = await db.query(
    `
    SELECT
      kp.*,
      s.site_name,
      s.domain,
      COUNT(DISTINCT kpc.id) AS category_count,
      COUNT(DISTINCT kpcl.id) AS cluster_count,
      COUNT(DISTINCT kpi.id) AS item_count,
      SUM(kpi.review_status = 'approved') AS approved_item_count,
      SUM(kpi.review_status = 'imported') AS imported_item_count,
      SUM(kpi.review_status = 'duplicate') AS duplicate_item_count,
      SUM(kpi.review_status = 'rejected') AS rejected_item_count,
      SUM(kpi.review_status = 'pending') AS pending_item_count
    FROM keyword_packs kp
    INNER JOIN sites s ON s.id = kp.site_id
    LEFT JOIN keyword_pack_categories kpc
      ON kpc.keyword_pack_id = kp.id
    LEFT JOIN keyword_pack_clusters kpcl
      ON kpcl.keyword_pack_id = kp.id
    LEFT JOIN keyword_pack_items kpi
      ON kpi.keyword_pack_id = kp.id
    WHERE kp.id = ?
    GROUP BY kp.id, s.site_name, s.domain
    LIMIT 1
    `,
    [keywordPackId]
  );

  return rows[0] || null;
}

export async function listKeywordPacks() {
  const [rows]: any = await db.query(
    `
    SELECT
      kp.*,
      s.site_name,
      s.domain,
      COUNT(kpi.id) AS item_count,
      SUM(kpi.review_status = 'approved') AS approved_item_count,
      SUM(kpi.review_status = 'imported') AS imported_item_count,
      SUM(kpi.review_status = 'duplicate') AS duplicate_item_count,
      SUM(kpi.review_status = 'rejected') AS rejected_item_count,
      SUM(kpi.review_status = 'pending') AS pending_item_count
    FROM keyword_packs kp
    INNER JOIN sites s ON s.id = kp.site_id
    LEFT JOIN keyword_pack_items kpi
      ON kpi.keyword_pack_id = kp.id
    GROUP BY kp.id, s.site_name, s.domain
    ORDER BY kp.created_at DESC
    `
  );

  return rows;
}

export async function updateKeywordPackDraft(
  keywordPackId: string,
  input: {
    name?: string;
    niche?: string;
    targetLanguage?: string | null;
    targetCountries?: string[] | null;
    audience?: string | null;
    businessGoal?: string | null;
    monetizationModel?: string | null;
    excludedTopics?: string | null;
    preferredCategories?: string | null;
    brandNotes?: string | null;
    generationMode?: string;
    requestedKeywordCount?: number;
  }
) {
  const [result]: any = await db.query(
    `
    UPDATE keyword_packs
    SET
      name = COALESCE(?, name),
      niche = COALESCE(?, niche),
      target_language = CASE WHEN ? THEN ? ELSE target_language END,
      target_countries = CASE WHEN ? THEN ? ELSE target_countries END,
      audience = CASE WHEN ? THEN ? ELSE audience END,
      business_goal = CASE WHEN ? THEN ? ELSE business_goal END,
      monetization_model = CASE WHEN ? THEN ? ELSE monetization_model END,
      excluded_topics = CASE WHEN ? THEN ? ELSE excluded_topics END,
      preferred_categories = CASE WHEN ? THEN ? ELSE preferred_categories END,
      brand_notes = CASE WHEN ? THEN ? ELSE brand_notes END,
      generation_mode = COALESCE(?, generation_mode),
      requested_keyword_count = COALESCE(?, requested_keyword_count),
      updated_at = NOW()
    WHERE id = ?
      AND status IN ('draft', 'failed', 'cancelled')
    `,
    [
      input.name ?? null,
      input.niche ?? null,
      input.targetLanguage !== undefined,
      input.targetLanguage ?? null,
      input.targetCountries !== undefined,
      input.targetCountries === undefined
        ? null
        : JSON.stringify(input.targetCountries || []),
      input.audience !== undefined,
      input.audience ?? null,
      input.businessGoal !== undefined,
      input.businessGoal ?? null,
      input.monetizationModel !== undefined,
      input.monetizationModel ?? null,
      input.excludedTopics !== undefined,
      input.excludedTopics ?? null,
      input.preferredCategories !== undefined,
      input.preferredCategories ?? null,
      input.brandNotes !== undefined,
      input.brandNotes ?? null,
      input.generationMode ?? null,
      input.requestedKeywordCount ?? null,
      keywordPackId,
    ]
  );

  if (result.affectedRows === 0) {
    throw new Error(
      "Keyword pack was not found or cannot be edited in its current status."
    );
  }
}

export async function queueKeywordPack(keywordPackId: string) {
  const [result]: any = await db.query(
    `
    UPDATE keyword_packs
    SET
      status = 'queued',
      progress_percent = 0,
      current_step = NULL,
      error_message = NULL,
      started_at = NULL,
      finished_at = NULL,
      updated_at = NOW()
    WHERE id = ?
      AND status IN ('draft', 'failed', 'cancelled')
    `,
    [keywordPackId]
  );

  if (result.affectedRows === 0) {
    throw new Error(
      "Keyword pack was not found or cannot be queued in its current status."
    );
  }

  await addKeywordPackEvent({
    keywordPackId,
    eventType: "pack_queued",
    status: "queued",
    message: "Keyword pack added to the generation queue.",
  });
}

export async function retryKeywordPack(keywordPackId: string) {
  const [result]: any = await db.query(
    `
    UPDATE keyword_packs
    SET
      status = 'queued',
      progress_percent = 0,
      current_step = NULL,
      error_message = NULL,
      started_at = NULL,
      finished_at = NULL,
      updated_at = NOW()
    WHERE id = ?
      AND status = 'failed'
    `,
    [keywordPackId]
  );

  if (result.affectedRows === 0) {
    throw new Error(
      "Keyword pack was not found or is not failed."
    );
  }

  await addKeywordPackEvent({
    keywordPackId,
    eventType: "pack_retry_queued",
    status: "queued",
    message: "Keyword pack retry added to the generation queue.",
  });
}

export async function cancelKeywordPack(keywordPackId: string) {
  const [result]: any = await db.query(
    `
    UPDATE keyword_packs
    SET
      status = 'cancelled',
      current_step = NULL,
      error_message = NULL,
      finished_at = NOW(),
      updated_at = NOW()
    WHERE id = ?
      AND status IN ('queued', 'running')
    `,
    [keywordPackId]
  );

  if (result.affectedRows === 0) {
    throw new Error(
      "Keyword pack was not found or cannot be cancelled in its current status."
    );
  }

  await addKeywordPackEvent({
    keywordPackId,
    eventType: "pack_cancel_requested",
    status: "cancelled",
    message: "Keyword pack cancellation requested.",
  });
}

export async function getLiveKeywordsForSite(siteId: string) {
  const [rows]: any = await db.query(
    `
    SELECT id, keyword
    FROM keywords
    WHERE site_id = ?
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 5000
    `,
    [siteId]
  );

  return rows as Array<{
    id: string;
    keyword: string;
  }>;
}

export async function getKeywordPackCategories(keywordPackId: string) {
  const [rows]: any = await db.query(
    `
    SELECT *
    FROM keyword_pack_categories
    WHERE keyword_pack_id = ?
    ORDER BY sort_order ASC, created_at ASC
    `,
    [keywordPackId]
  );

  return rows;
}

export async function getKeywordPackClusters(keywordPackId: string) {
  const [rows]: any = await db.query(
    `
    SELECT *
    FROM keyword_pack_clusters
    WHERE keyword_pack_id = ?
    ORDER BY sort_order ASC, created_at ASC
    `,
    [keywordPackId]
  );

  return rows;
}

export async function getKeywordPackItems(keywordPackId: string) {
  const [rows]: any = await db.query(
    `
    SELECT *
    FROM keyword_pack_items
    WHERE keyword_pack_id = ?
    ORDER BY is_pillar DESC, created_at ASC
    `,
    [keywordPackId]
  );

  return rows;
}

export async function getKeywordPackItemsPage(input: {
  keywordPackId: string;
  query?: string;
  reviewStatus?: KeywordPackReviewStatus;
  limit: number;
  offset: number;
}) {
  const conditions = ["kpi.keyword_pack_id = ?"];
  const params: unknown[] = [input.keywordPackId];

  if (input.reviewStatus) {
    conditions.push("kpi.review_status = ?");
    params.push(input.reviewStatus);
  }

  if (input.query) {
    conditions.push(
      "(kpi.keyword LIKE ? OR kpi.suggested_title LIKE ? OR kpc.name LIKE ? OR kpcl.name LIKE ?)"
    );
    const query = `%${input.query}%`;
    params.push(query, query, query, query);
  }

  const whereSql = conditions.join(" AND ");

  const [rows]: any = await db.query(
    `
    SELECT
      kpi.*,
      kpc.name AS category_name,
      kpcl.name AS cluster_name,
      kw.keyword AS existing_keyword
    FROM keyword_pack_items kpi
    INNER JOIN keyword_pack_categories kpc
      ON kpc.id = kpi.category_id
    INNER JOIN keyword_pack_clusters kpcl
      ON kpcl.id = kpi.cluster_id
    LEFT JOIN keywords kw
      ON kw.id = kpi.existing_keyword_id
    WHERE ${whereSql}
    ORDER BY kpi.is_pillar DESC, kpi.ai_opportunity_score DESC, kpi.keyword ASC
    LIMIT ?
    OFFSET ?
    `,
    [...params, input.limit, input.offset]
  );

  const [[countRow]]: any = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM keyword_pack_items kpi
    INNER JOIN keyword_pack_categories kpc
      ON kpc.id = kpi.category_id
    INNER JOIN keyword_pack_clusters kpcl
      ON kpcl.id = kpi.cluster_id
    WHERE ${whereSql}
    `,
    params
  );

  return {
    items: rows,
    total: Number(countRow?.total ?? 0),
  };
}

export async function updateKeywordPackProgress(
  keywordPackId: string,
  input: {
    status?: KeywordPackStatus;
    progressPercent?: number;
    currentStep?: string | null;
    errorMessage?: string | null;
    started?: boolean;
    finished?: boolean;
  }
) {
  await db.query(
    `
    UPDATE keyword_packs
    SET
      status = COALESCE(?, status),
      progress_percent = COALESCE(?, progress_percent),
      current_step = ?,
      error_message = ?,
      started_at = CASE WHEN ? = TRUE THEN COALESCE(started_at, NOW()) ELSE started_at END,
      finished_at = CASE WHEN ? = TRUE THEN NOW() ELSE finished_at END,
      updated_at = NOW()
    WHERE id = ?
    `,
    [
      input.status || null,
      input.progressPercent ?? null,
      input.currentStep ?? null,
      input.errorMessage ?? null,
      input.started || false,
      input.finished || false,
      keywordPackId,
    ]
  );
}

export async function replaceKeywordPackCategories(
  keywordPackId: string,
  categories: KeywordPackCategoryDraft[]
) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      "DELETE FROM keyword_pack_categories WHERE keyword_pack_id = ?",
      [keywordPackId]
    );

    for (const category of categories) {
      await connection.query(
        `
        INSERT INTO keyword_pack_categories (
          id,
          keyword_pack_id,
          name,
          slug,
          description,
          priority,
          sort_order,
          status,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
        [
          category.id || randomUUID(),
          keywordPackId,
          category.name,
          category.slug,
          category.description || null,
          category.priority,
          category.sortOrder,
          category.status || "pending",
        ]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function replaceKeywordPackClusters(
  keywordPackId: string,
  clusters: KeywordPackClusterDraft[]
) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      "DELETE FROM keyword_pack_clusters WHERE keyword_pack_id = ?",
      [keywordPackId]
    );

    for (const cluster of clusters) {
      await connection.query(
        `
        INSERT INTO keyword_pack_clusters (
          id,
          keyword_pack_id,
          category_id,
          name,
          slug,
          description,
          pillar_keyword,
          pillar_title,
          sort_order,
          status,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
        [
          cluster.id || randomUUID(),
          keywordPackId,
          cluster.categoryId,
          cluster.name,
          cluster.slug,
          cluster.description || null,
          cluster.pillarKeyword || null,
          cluster.pillarTitle || null,
          cluster.sortOrder,
          cluster.status || "pending",
        ]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function insertKeywordPackClusters(
  keywordPackId: string,
  clusters: KeywordPackClusterDraft[]
) {
  for (const cluster of clusters) {
    await db.query(
      `
      INSERT INTO keyword_pack_clusters (
        id,
        keyword_pack_id,
        category_id,
        name,
        slug,
        description,
        pillar_keyword,
        pillar_title,
        sort_order,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        cluster.id || randomUUID(),
        keywordPackId,
        cluster.categoryId,
        cluster.name,
        cluster.slug,
        cluster.description || null,
        cluster.pillarKeyword || null,
        cluster.pillarTitle || null,
        cluster.sortOrder,
        cluster.status || "pending",
      ]
    );
  }
}

export async function insertKeywordPackItems(
  keywordPackId: string,
  items: KeywordPackItemDraft[]
) {
  for (const item of items) {
    await db.query(
      `
      INSERT INTO keyword_pack_items (
        id,
        keyword_pack_id,
        category_id,
        cluster_id,
        keyword,
        suggested_title,
        intent,
        article_type,
        priority,
        estimated_search_volume,
        estimated_difficulty,
        ai_opportunity_score,
        is_pillar,
        parent_pillar_item_id,
        related_item_ids_json,
        notes,
        review_status,
        existing_keyword_id,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, NOW(), NOW()
      )
      `,
      [
        item.id || randomUUID(),
        keywordPackId,
        item.categoryId,
        item.clusterId,
        item.keyword,
        item.suggestedTitle || null,
        item.intent,
        item.articleType,
        item.priority,
        item.estimatedSearchVolume ?? null,
        item.estimatedDifficulty ?? null,
        item.aiOpportunityScore ?? null,
        item.isPillar,
        item.parentPillarItemId || null,
        item.relatedItemIds
          ? JSON.stringify(item.relatedItemIds)
          : null,
        item.notes || null,
        item.reviewStatus || "pending",
        item.existingKeywordId || null,
      ]
    );
  }
}

export async function replaceKeywordPackItems(
  keywordPackId: string,
  items: KeywordPackItemDraft[]
) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      "DELETE FROM keyword_pack_items WHERE keyword_pack_id = ?",
      [keywordPackId]
    );

    for (const item of items) {
      await connection.query(
        `
        INSERT INTO keyword_pack_items (
          id,
          keyword_pack_id,
          category_id,
          cluster_id,
          keyword,
          suggested_title,
          intent,
          article_type,
          priority,
          estimated_search_volume,
          estimated_difficulty,
          ai_opportunity_score,
          is_pillar,
          parent_pillar_item_id,
          related_item_ids_json,
          notes,
          review_status,
          existing_keyword_id,
          created_at,
          updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, NOW(), NOW()
        )
        `,
        [
          item.id || randomUUID(),
          keywordPackId,
          item.categoryId,
          item.clusterId,
          item.keyword,
          item.suggestedTitle || null,
          item.intent,
          item.articleType,
          item.priority,
          item.estimatedSearchVolume ?? null,
          item.estimatedDifficulty ?? null,
          item.aiOpportunityScore ?? null,
          item.isPillar,
          item.parentPillarItemId || null,
          item.relatedItemIds
            ? JSON.stringify(item.relatedItemIds)
            : null,
          item.notes || null,
          item.reviewStatus || "pending",
          item.existingKeywordId || null,
        ]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateKeywordPackItemRelationships(
  items: Array<{
    id: string;
    parentPillarItemId?: string | null;
    relatedItemIds?: string[] | null;
    reviewStatus?: string;
    existingKeywordId?: string | null;
    notes?: string | null;
  }>
) {
  for (const item of items) {
    await db.query(
      `
      UPDATE keyword_pack_items
      SET
        parent_pillar_item_id = ?,
        related_item_ids_json = ?,
        review_status = COALESCE(?, review_status),
        existing_keyword_id = COALESCE(?, existing_keyword_id),
        notes = COALESCE(?, notes),
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        item.parentPillarItemId || null,
        item.relatedItemIds
          ? JSON.stringify(item.relatedItemIds)
          : null,
        item.reviewStatus || null,
        item.existingKeywordId || null,
        item.notes || null,
        item.id,
      ]
    );
  }
}

export async function updateKeywordPackItem(
  keywordPackId: string,
  itemId: string,
  input: {
    keyword?: string;
    suggestedTitle?: string | null;
    intent?: string;
    articleType?: string;
    priority?: string;
    estimatedSearchVolume?: number | null;
    estimatedDifficulty?: number | null;
    aiOpportunityScore?: number | null;
    notes?: string | null;
    reviewStatus?: KeywordPackReviewStatus;
  }
) {
  const [result]: any = await db.query(
    `
    UPDATE keyword_pack_items
    SET
      keyword = COALESCE(?, keyword),
      suggested_title = CASE WHEN ? THEN ? ELSE suggested_title END,
      intent = COALESCE(?, intent),
      article_type = COALESCE(?, article_type),
      priority = COALESCE(?, priority),
      estimated_search_volume = CASE WHEN ? THEN ? ELSE estimated_search_volume END,
      estimated_difficulty = CASE WHEN ? THEN ? ELSE estimated_difficulty END,
      ai_opportunity_score = CASE WHEN ? THEN ? ELSE ai_opportunity_score END,
      notes = CASE WHEN ? THEN ? ELSE notes END,
      review_status = COALESCE(?, review_status),
      updated_at = NOW()
    WHERE id = ?
      AND keyword_pack_id = ?
      AND review_status != 'imported'
    `,
    [
      input.keyword ?? null,
      input.suggestedTitle !== undefined,
      input.suggestedTitle ?? null,
      input.intent ?? null,
      input.articleType ?? null,
      input.priority ?? null,
      input.estimatedSearchVolume !== undefined,
      input.estimatedSearchVolume ?? null,
      input.estimatedDifficulty !== undefined,
      input.estimatedDifficulty ?? null,
      input.aiOpportunityScore !== undefined,
      input.aiOpportunityScore ?? null,
      input.notes !== undefined,
      input.notes ?? null,
      input.reviewStatus ?? null,
      itemId,
      keywordPackId,
    ]
  );

  if (result.affectedRows === 0) {
    throw new Error(
      "Keyword pack item was not found or cannot be edited."
    );
  }
}

export async function reviewKeywordPackItems(
  keywordPackId: string,
  input: {
    itemIds?: string[];
    reviewStatus: KeywordPackReviewStatus;
  }
) {
  const ids = [...new Set(input.itemIds || [])].filter(Boolean);

  if (ids.length === 0) {
    const [result]: any = await db.query(
      `
      UPDATE keyword_pack_items
      SET review_status = ?, updated_at = NOW()
      WHERE keyword_pack_id = ?
        AND review_status NOT IN ('imported', 'duplicate')
      `,
      [input.reviewStatus, keywordPackId]
    );

    return Number(result.affectedRows ?? 0);
  }

  const placeholders = ids.map(() => "?").join(", ");
  const [result]: any = await db.query(
    `
    UPDATE keyword_pack_items
    SET review_status = ?, updated_at = NOW()
    WHERE keyword_pack_id = ?
      AND id IN (${placeholders})
      AND review_status != 'imported'
    `,
    [input.reviewStatus, keywordPackId, ...ids]
  );

  return Number(result.affectedRows ?? 0);
}

export async function getKeywordPackEvents(keywordPackId: string) {
  const [rows]: any = await db.query(
    `
    SELECT *
    FROM keyword_pack_events
    WHERE keyword_pack_id = ?
    ORDER BY created_at ASC, id ASC
    `,
    [keywordPackId]
  );

  return rows;
}

export async function addKeywordPackEvent(input: KeywordPackEventInput) {
  await db.query(
    `
    INSERT INTO keyword_pack_events (
      id,
      keyword_pack_id,
      event_type,
      status,
      message,
      details_json,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      randomUUID(),
      input.keywordPackId,
      input.eventType,
      input.status || null,
      input.message,
      input.details ? JSON.stringify(input.details) : null,
    ]
  );
}
