import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

const MAX_OPPORTUNITIES = 500;

type KeywordIntent =
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational";

type ArticleType =
  | "pillar"
  | "cluster"
  | "faq"
  | "review"
  | "comparison"
  | "news"
  | "how_to";

type Priority = "high" | "medium" | "low";
type KeywordStatus = "new" | "approved" | "rejected" | "needs_review";

type KeywordOpportunity = {
  keyword?: unknown;
  categorySlug?: unknown;
  category?: unknown;
  clusterSlug?: unknown;
  cluster?: unknown;
  intent?: unknown;
  articleType?: unknown;
  article_type?: unknown;
  priority?: unknown;
  status?: unknown;
  searchVolume?: unknown;
  search_volume?: unknown;
  volume?: unknown;
  difficulty?: unknown;
  keywordDifficulty?: unknown;
  keyword_difficulty?: unknown;
  kd?: unknown;
  cpc?: unknown;
  opportunityScore?: unknown;
  opportunity_score?: unknown;
  relatedKeywords?: unknown;
  related_keywords?: unknown;
  notes?: unknown;
  source?: unknown;
};

type ImportError = {
  index: number;
  keyword?: string;
  message: string;
};

export type KeywordOpportunityImportResult = {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
};

const validIntents = new Set<KeywordIntent>([
  "informational",
  "commercial",
  "transactional",
  "navigational",
]);

const validArticleTypes = new Set<ArticleType>([
  "pillar",
  "cluster",
  "faq",
  "review",
  "comparison",
  "news",
  "how_to",
]);

const validPriorities = new Set<Priority>(["high", "medium", "low"]);
const validStatuses = new Set<KeywordStatus>([
  "new",
  "approved",
  "rejected",
  "needs_review",
]);

export async function importKeywordOpportunities(input: {
  siteId: string;
  opportunities: KeywordOpportunity[];
  defaultStatus?: unknown;
  updateExistingStatus?: boolean;
}): Promise<KeywordOpportunityImportResult> {
  if (!input.siteId.trim()) {
    throw new Error("siteId is required.");
  }

  if (!Array.isArray(input.opportunities)) {
    throw new Error("opportunities must be an array.");
  }

  if (input.opportunities.length === 0) {
    throw new Error("At least one keyword opportunity is required.");
  }

  if (input.opportunities.length > MAX_OPPORTUNITIES) {
    throw new Error(
      `A maximum of ${MAX_OPPORTUNITIES} opportunities can be imported at once.`
    );
  }

  const defaultStatus = normalizeStatus(
    input.defaultStatus,
    "needs_review"
  );

  const connection = await db.getConnection();
  const result: KeywordOpportunityImportResult = {
    total: input.opportunities.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  try {
    await connection.beginTransaction();

    const [siteRows]: any = await connection.query(
      `
      SELECT id
      FROM sites
      WHERE id = ?
      LIMIT 1
      `,
      [input.siteId]
    );

    if (!siteRows.length) {
      throw new Error("Site not found.");
    }

    const [categoryRows]: any = await connection.query(
      `
      SELECT id, slug, name
      FROM categories
      WHERE site_id = ?
      `,
      [input.siteId]
    );

    const [clusterRows]: any = await connection.query(
      `
      SELECT id, slug, name
      FROM topic_clusters
      WHERE site_id = ?
      `,
      [input.siteId]
    );

    const categoryLookup = buildLookup(categoryRows);
    const clusterLookup = buildLookup(clusterRows);

    for (let index = 0; index < input.opportunities.length; index += 1) {
      const item = input.opportunities[index];
      const keyword = cleanText(item.keyword).toLowerCase();

      if (!keyword) {
        result.skipped += 1;
        result.errors.push({
          index,
          message: "Keyword is empty.",
        });
        continue;
      }

      const categoryKey = cleanText(
        item.categorySlug || item.category
      );
      const clusterKey = cleanText(item.clusterSlug || item.cluster);
      const categoryId = categoryKey
        ? categoryLookup.get(normalizeLookupKey(categoryKey)) ?? null
        : null;
      const clusterId = clusterKey
        ? clusterLookup.get(normalizeLookupKey(clusterKey)) ?? null
        : null;

      if (categoryKey && !categoryId) {
        result.skipped += 1;
        result.errors.push({
          index,
          keyword,
          message: `Category not found: ${categoryKey}`,
        });
        continue;
      }

      if (clusterKey && !clusterId) {
        result.skipped += 1;
        result.errors.push({
          index,
          keyword,
          message: `Topic cluster not found: ${clusterKey}`,
        });
        continue;
      }

      const status = normalizeStatus(item.status, defaultStatus);
      const notes = buildNotes(item);
      const searchVolume = nullableNumber(
        item.searchVolume || item.search_volume || item.volume
      );
      const difficulty = nullableNumber(
        item.difficulty ||
          item.keywordDifficulty ||
          item.keyword_difficulty ||
          item.kd
      );
      const cpc = nullableNumber(item.cpc);
      const opportunityScore = nullableNumber(
        item.opportunityScore || item.opportunity_score
      );
      const relatedKeywords = normalizeRelatedKeywords(
        item.relatedKeywords || item.related_keywords
      );
      const [existingRows]: any = await connection.query(
        `
        SELECT id
        FROM keywords
        WHERE site_id = ?
          AND keyword = ?
        LIMIT 1
        `,
        [input.siteId, keyword]
      );

      if (existingRows.length) {
        await connection.query(
          `
          UPDATE keywords
          SET
            category_id = COALESCE(?, category_id),
            cluster_id = COALESCE(?, cluster_id),
            intent = ?,
            search_volume = COALESCE(?, search_volume),
            difficulty = COALESCE(?, difficulty),
            cpc = COALESCE(?, cpc),
            opportunity_score = COALESCE(?, opportunity_score),
            priority = ?,
            status = CASE WHEN ? THEN ? ELSE status END,
            related_keywords = COALESCE(?, related_keywords),
            article_type = ?,
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [
            categoryId,
            clusterId,
            normalizeIntent(item.intent),
            searchVolume,
            difficulty,
            cpc,
            opportunityScore,
            normalizePriority(item.priority),
            Boolean(input.updateExistingStatus),
            status,
            relatedKeywords,
            normalizeArticleType(item.articleType || item.article_type),
            notes,
            existingRows[0].id,
          ]
        );

        result.updated += 1;
        continue;
      }

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
          article_type,
          content_stage,
          created_by,
          notes
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, 'keyword', 'api', ?
        )
        `,
        [
          randomUUID(),
          input.siteId,
          categoryId,
          clusterId,
          keyword,
          normalizeIntent(item.intent),
          searchVolume ?? 0,
          difficulty,
          cpc,
          opportunityScore,
          normalizePriority(item.priority),
          status,
          relatedKeywords,
          normalizeArticleType(item.articleType || item.article_type),
          notes,
        ]
      );

      result.inserted += 1;
    }

    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function buildLookup(rows: Array<{ id: string; slug: string; name: string }>) {
  const lookup = new Map<string, string>();

  for (const row of rows) {
    lookup.set(normalizeLookupKey(row.slug), row.id);
    lookup.set(normalizeLookupKey(row.name), row.id);
  }

  return lookup;
}

function normalizeLookupKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableNumber(value: unknown) {
  const text = cleanText(value);

  if (!text && typeof value !== "number") {
    return null;
  }

  const number =
    typeof value === "number"
      ? value
      : Number(text.replace(/,/g, ""));

  return Number.isFinite(number) ? number : null;
}

function normalizeIntent(value: unknown): KeywordIntent {
  const intent = cleanText(value).toLowerCase() as KeywordIntent;
  return validIntents.has(intent) ? intent : "informational";
}

function normalizeArticleType(value: unknown): ArticleType {
  const articleType = cleanText(value)
    .toLowerCase()
    .replace(/\s+/g, "_") as ArticleType;

  return validArticleTypes.has(articleType) ? articleType : "cluster";
}

function normalizePriority(value: unknown): Priority {
  const priority = cleanText(value).toLowerCase() as Priority;
  return validPriorities.has(priority) ? priority : "medium";
}

function normalizeStatus(
  value: unknown,
  fallback: KeywordStatus
): KeywordStatus {
  const status = cleanText(value).toLowerCase() as KeywordStatus;
  return validStatuses.has(status) ? status : fallback;
}

function normalizeRelatedKeywords(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map(cleanText)
      .filter(Boolean)
      .join(", ");
  }

  return cleanText(value) || null;
}

function buildNotes(item: KeywordOpportunity) {
  const notes = cleanText(item.notes);
  const source = cleanText(item.source);

  if (notes && source) {
    return `${notes}\nSource: ${source}`;
  }

  return notes || (source ? `Source: ${source}` : null);
}
