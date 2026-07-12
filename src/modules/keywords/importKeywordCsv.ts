import { randomUUID } from "node:crypto";
import { parse } from "csv-parse/sync";
import { db } from "@/lib/db";

const MAX_ROWS = 5000;

type ImportStatus =
  | "new"
  | "approved"
  | "rejected"
  | "needs_review";

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

type CsvRow = Record<string, string | undefined>;

type ImportError = {
  row: number;
  keyword?: string;
  message: string;
};

export type KeywordImportResult = {
  totalRows: number;
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

const validPriorities = new Set<Priority>([
  "high",
  "medium",
  "low",
]);

const validStatuses = new Set<ImportStatus>([
  "new",
  "approved",
  "rejected",
  "needs_review",
]);

function normalizeHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function cleanText(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function nullableNumber(value: unknown) {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  const normalized = text.replace(/,/g, "");
  const number = Number(normalized);

  return Number.isFinite(number)
    ? number
    : null;
}

function normalizeIntent(
  value: unknown
): KeywordIntent {
  const intent = cleanText(value)
    .toLowerCase() as KeywordIntent;

  return validIntents.has(intent)
    ? intent
    : "informational";
}

function normalizeArticleType(
  value: unknown
): ArticleType {
  const articleType = cleanText(value)
    .toLowerCase()
    .replace(/\s+/g, "_") as ArticleType;

  return validArticleTypes.has(articleType)
    ? articleType
    : "cluster";
}

function normalizePriority(
  value: unknown
): Priority {
  const priority = cleanText(value)
    .toLowerCase() as Priority;

  return validPriorities.has(priority)
    ? priority
    : "medium";
}

function normalizeStatus(
  value: unknown,
  defaultStatus: ImportStatus
): ImportStatus {
  const status = cleanText(value)
    .toLowerCase() as ImportStatus;

  return validStatuses.has(status)
    ? status
    : defaultStatus;
}

export async function importKeywordCsv(input: {
  csvText: string;
  siteDomain: string;
  defaultStatus: ImportStatus;
}): Promise<KeywordImportResult> {
  let records: CsvRow[];

  try {
    records = parse(input.csvText, {
      bom: true,
      columns: (headers: string[]) =>
        headers.map(normalizeHeader),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as CsvRow[];
  } catch (error: unknown) {
    throw new Error(
      error instanceof Error
        ? `CSV parsing failed: ${error.message}`
        : "CSV parsing failed."
    );
  }

  if (records.length === 0) {
    throw new Error("The CSV file contains no data rows.");
  }

  if (records.length > MAX_ROWS) {
    throw new Error(
      `The CSV contains ${records.length} rows. The current limit is ${MAX_ROWS}.`
    );
  }

  const hasKeywordColumn =
    Object.prototype.hasOwnProperty.call(
      records[0],
      "keyword"
    );

  if (!hasKeywordColumn) {
    throw new Error(
      'The CSV must contain a column named "keyword".'
    );
  }

  const connection = await db.getConnection();

  const result: KeywordImportResult = {
    totalRows: records.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  try {
    await connection.beginTransaction();

    const [siteRows]: any =
      await connection.query(
        `
        SELECT id
        FROM sites
        WHERE domain = ?
        LIMIT 1
        `,
        [input.siteDomain]
      );

    if (!siteRows.length) {
      throw new Error(
        `Site not found: ${input.siteDomain}`
      );
    }

    const siteId = siteRows[0].id;

    const [categoryRows]: any =
      await connection.query(
        `
        SELECT id, slug
        FROM categories
        WHERE site_id = ?
        `,
        [siteId]
      );

    const [clusterRows]: any =
      await connection.query(
        `
        SELECT id, slug
        FROM topic_clusters
        WHERE site_id = ?
        `,
        [siteId]
      );

    const categoryBySlug = new Map<
      string,
      string
    >(
      categoryRows.map(
        (category: {
          id: string;
          slug: string;
        }) => [category.slug, category.id]
      )
    );

    const clusterBySlug = new Map<
      string,
      string
    >(
      clusterRows.map(
        (cluster: {
          id: string;
          slug: string;
        }) => [cluster.slug, cluster.id]
      )
    );

    for (
      let index = 0;
      index < records.length;
      index += 1
    ) {
      const row = records[index];
      const rowNumber = index + 2;

      const keyword = cleanText(
        row.keyword
      ).toLowerCase();

      if (!keyword) {
        result.skipped += 1;
        result.errors.push({
          row: rowNumber,
          message: "Keyword is empty.",
        });
        continue;
      }

      const categorySlug = cleanText(
        row.category_slug || row.category
      ).toLowerCase();

      const clusterSlug = cleanText(
        row.cluster_slug ||
          row.topic_cluster_slug ||
          row.cluster
      ).toLowerCase();

      const categoryId = categorySlug
        ? categoryBySlug.get(categorySlug) ??
          null
        : null;

      const clusterId = clusterSlug
        ? clusterBySlug.get(clusterSlug) ??
          null
        : null;

      if (
        categorySlug &&
        !categoryId
      ) {
        result.skipped += 1;
        result.errors.push({
          row: rowNumber,
          keyword,
          message: `Category slug not found: ${categorySlug}`,
        });
        continue;
      }

      if (
        clusterSlug &&
        !clusterId
      ) {
        result.skipped += 1;
        result.errors.push({
          row: rowNumber,
          keyword,
          message: `Cluster slug not found: ${clusterSlug}`,
        });
        continue;
      }

      const intent = normalizeIntent(
        row.intent
      );

      const articleType =
        normalizeArticleType(
          row.article_type
        );

      const priority = normalizePriority(
        row.priority
      );

      const status = normalizeStatus(
        row.status,
        input.defaultStatus
      );

      const searchVolume =
        nullableNumber(
          row.search_volume ||
            row.volume
        ) ?? 0;

      const difficulty = nullableNumber(
        row.difficulty ||
          row.keyword_difficulty ||
          row.kd
      );

      const cpc = nullableNumber(row.cpc);

      const opportunityScore =
        nullableNumber(
          row.opportunity_score
        );

      const notes = cleanText(row.notes);

      const [existingRows]: any =
        await connection.query(
          `
          SELECT id
          FROM keywords
          WHERE site_id = ?
            AND keyword = ?
          LIMIT 1
          `,
          [siteId, keyword]
        );

      if (existingRows.length) {
        await connection.query(
          `
          UPDATE keywords
          SET
            category_id = COALESCE(?, category_id),
            cluster_id = COALESCE(?, cluster_id),
            intent = ?,
            search_volume = ?,
            difficulty = ?,
            cpc = ?,
            opportunity_score = ?,
            priority = ?,
            status = ?,
            article_type = ?,
            content_stage = 'keyword',
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [
            categoryId,
            clusterId,
            intent,
            searchVolume,
            difficulty,
            cpc,
            opportunityScore,
            priority,
            status,
            articleType,
            notes || null,
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
          article_type,
          content_stage,
          created_by,
          notes
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, 'keyword', 'import', ?
        )
        `,
        [
          randomUUID(),
          siteId,
          categoryId,
          clusterId,
          keyword,
          intent,
          searchVolume,
          difficulty,
          cpc,
          opportunityScore,
          priority,
          status,
          articleType,
          notes || null,
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