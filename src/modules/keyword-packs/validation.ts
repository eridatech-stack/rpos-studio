import { randomUUID } from "node:crypto";
import type {
  KeywordPackArticleType,
  KeywordPackCategoryDraft,
  KeywordPackClusterDraft,
  KeywordPackIntent,
  KeywordPackItemDraft,
  KeywordPackPriority,
} from "@/modules/keyword-packs/types";

const validIntents = new Set<KeywordPackIntent>([
  "informational",
  "commercial",
  "transactional",
  "navigational",
]);

const validArticleTypes = new Set<KeywordPackArticleType>([
  "pillar",
  "cluster",
  "faq",
  "review",
  "comparison",
  "news",
  "how_to",
]);

const validPriorities = new Set<KeywordPackPriority>([
  "high",
  "medium",
  "low",
]);

export type KeywordPackValidationIssue = {
  type:
    | "duplicate"
    | "near_duplicate"
    | "existing_keyword"
    | "missing_pillar"
    | "missing_parent_pillar"
    | "excluded_topic"
    | "shortfall";
  keyword?: string;
  message: string;
};

export type KeywordPackValidationResult = {
  items: KeywordPackItemDraft[];
  issues: KeywordPackValidationIssue[];
  shortfallCount: number;
};

export function safeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 255);
}

export function normalizeKeyword(value: unknown) {
  return replaceStaleYears(cleanText(value))
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function normalizeCategoryDraft(
  input: any,
  sortOrder: number
): KeywordPackCategoryDraft {
  const name = replaceStaleYears(cleanText(input?.name));
  const slug = safeSlug(
    replaceStaleYears(cleanText(input?.slug)) || name
  );

  return {
    id: randomUUID(),
    name: name || `Category ${sortOrder + 1}`,
    slug: slug || `category-${sortOrder + 1}`,
    description: replaceStaleYears(cleanText(input?.description)) || null,
    priority: normalizePriority(input?.priority),
    sortOrder,
    status: "pending",
  };
}

export function normalizeClusterDraft(
  input: any,
  categoryId: string,
  sortOrder: number
): KeywordPackClusterDraft {
  const name = replaceStaleYears(cleanText(input?.name));
  const slug = safeSlug(
    replaceStaleYears(cleanText(input?.slug)) || name
  );

  return {
    id: randomUUID(),
    categoryId,
    name: name || `Cluster ${sortOrder + 1}`,
    slug: slug || `cluster-${sortOrder + 1}`,
    description: replaceStaleYears(cleanText(input?.description)) || null,
    pillarKeyword: normalizeKeyword(input?.pillar_keyword) || null,
    pillarTitle: replaceStaleYears(cleanText(input?.pillar_title)) || null,
    sortOrder,
    status: "pending",
  };
}

export function normalizeItemDraft(
  input: any,
  ids: {
    categoryId: string;
    clusterId: string;
  }
): KeywordPackItemDraft {
  const keyword = normalizeKeyword(input?.keyword);
  const isPillar =
    input?.is_pillar === true ||
    input?.isPillar === true ||
    normalizeArticleType(input?.article_type || input?.articleType) ===
      "pillar";

  return {
    id: randomUUID(),
    categoryId: ids.categoryId,
    clusterId: ids.clusterId,
    keyword,
    suggestedTitle: cleanText(
      input?.suggested_title || input?.suggestedTitle
    )
      ? replaceStaleYears(
          cleanText(input?.suggested_title || input?.suggestedTitle)
        )
      : null,
    intent: normalizeIntent(input?.intent),
    articleType: isPillar
      ? "pillar"
      : normalizeArticleType(input?.article_type || input?.articleType),
    priority: normalizePriority(input?.priority),
    estimatedSearchVolume: boundedNumber(
      input?.estimated_search_volume || input?.estimatedSearchVolume,
      0,
      10000000
    ),
    estimatedDifficulty: boundedNumber(
      input?.estimated_difficulty || input?.estimatedDifficulty,
      0,
      100
    ),
    aiOpportunityScore: boundedNumber(
      input?.ai_opportunity_score || input?.aiOpportunityScore,
      0,
      100
    ),
    isPillar,
    notes: replaceStaleYears(cleanText(input?.notes)) || null,
    reviewStatus: "pending",
  };
}

export function validateKeywordPackItems(input: {
  requestedCount: number;
  items: KeywordPackItemDraft[];
  liveKeywords: Array<{ id: string; keyword: string }>;
  excludedTopics: string | null;
}): KeywordPackValidationResult {
  const issues: KeywordPackValidationIssue[] = [];
  const seen = new Set<string>();
  const accepted: KeywordPackItemDraft[] = [];
  const liveByKeyword = new Map(
    input.liveKeywords.map((item) => [
      normalizeKeyword(item.keyword),
      item.id,
    ])
  );
  const excluded = splitTerms(input.excludedTopics);

  for (const item of input.items) {
    const keyword = normalizeKeyword(item.keyword);

    if (!keyword) {
      continue;
    }

    if (seen.has(keyword)) {
      issues.push({
        type: "duplicate",
        keyword,
        message: "Exact duplicate removed from pack.",
      });
      continue;
    }

    const nearDuplicate = accepted.find((existing) =>
      areNearDuplicates(existing.keyword, keyword)
    );

    const existingKeywordId = liveByKeyword.get(keyword);
    const excludedTopic = excluded.find((term) =>
      keyword.includes(term)
    );

    seen.add(keyword);

    accepted.push({
      ...item,
      keyword,
      reviewStatus: existingKeywordId ? "duplicate" : item.reviewStatus,
      existingKeywordId: existingKeywordId || item.existingKeywordId,
      notes: appendNotes(
        item.notes,
        [
          nearDuplicate
            ? `Near duplicate of "${nearDuplicate.keyword}".`
            : "",
          excludedTopic
            ? `Contains excluded topic "${excludedTopic}".`
            : "",
          existingKeywordId
            ? "Duplicate of an existing site keyword."
            : "",
        ].filter(Boolean)
      ),
    });

    if (nearDuplicate) {
      issues.push({
        type: "near_duplicate",
        keyword,
        message: `Near duplicate of "${nearDuplicate.keyword}".`,
      });
    }

    if (existingKeywordId) {
      issues.push({
        type: "existing_keyword",
        keyword,
        message: "Keyword already exists in the live site library.",
      });
    }

    if (excludedTopic) {
      issues.push({
        type: "excluded_topic",
        keyword,
        message: `Keyword includes excluded topic "${excludedTopic}".`,
      });
    }
  }

  const byCluster = new Map<string, KeywordPackItemDraft[]>();

  for (const item of accepted) {
    const items = byCluster.get(item.clusterId) || [];
    items.push(item);
    byCluster.set(item.clusterId, items);
  }

  for (const clusterItems of byCluster.values()) {
    const pillar = clusterItems.find((item) => item.isPillar);

    if (!pillar) {
      issues.push({
        type: "missing_pillar",
        message: "A cluster is missing a pillar keyword.",
      });
      continue;
    }

    for (const item of clusterItems) {
      if (item.isPillar) {
        continue;
      }

      item.parentPillarItemId = pillar.id || null;
    }
  }

  const shortfallCount = Math.max(
    0,
    input.requestedCount - accepted.length
  );

  if (shortfallCount > 0) {
    issues.push({
      type: "shortfall",
      message: `Pack is short by ${shortfallCount} keyword(s).`,
    });
  }

  return {
    items: accepted.slice(0, input.requestedCount),
    issues,
    shortfallCount,
  };
}

export function buildInternalLinkRelationships(
  items: KeywordPackItemDraft[]
) {
  const byCluster = new Map<string, KeywordPackItemDraft[]>();

  for (const item of items) {
    const clusterItems = byCluster.get(item.clusterId) || [];
    clusterItems.push(item);
    byCluster.set(item.clusterId, clusterItems);
  }

  return items.map((item) => {
    const clusterItems = byCluster.get(item.clusterId) || [];
    const pillar = clusterItems.find((candidate) => candidate.isPillar);
    const siblings = clusterItems
      .filter((candidate) => candidate.id !== item.id)
      .slice(0, 4)
      .map((candidate) => candidate.id!)
      .filter(Boolean);

    return {
      id: item.id!,
      parentPillarItemId: item.isPillar
        ? null
        : pillar?.id || item.parentPillarItemId || null,
      relatedItemIds: item.isPillar
        ? clusterItems
            .filter((candidate) => !candidate.isPillar)
            .slice(0, 8)
            .map((candidate) => candidate.id!)
            .filter(Boolean)
        : siblings,
    };
  });
}

function normalizeIntent(value: unknown): KeywordPackIntent {
  const normalized = cleanText(value).toLowerCase() as KeywordPackIntent;
  return validIntents.has(normalized) ? normalized : "informational";
}

function normalizeArticleType(value: unknown): KeywordPackArticleType {
  const normalized = cleanText(value)
    .toLowerCase()
    .replace(/\s+/g, "_") as KeywordPackArticleType;

  return validArticleTypes.has(normalized) ? normalized : "cluster";
}

function normalizePriority(value: unknown): KeywordPackPriority {
  const normalized = cleanText(value).toLowerCase() as KeywordPackPriority;
  return validPriorities.has(normalized) ? normalized : "medium";
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function replaceStaleYears(value: string) {
  const currentYear = getCurrentContentYear();

  return value.replace(/\b20\d{2}\b/g, (match) => {
    const year = Number(match);

    return year < currentYear ? String(currentYear) : match;
  });
}

function getCurrentContentYear() {
  const timeZone =
    process.env.CONTENT_TIME_ZONE ||
    process.env.TZ ||
    "Asia/Yerevan";

  return Number(
    new Intl.DateTimeFormat("en", {
      timeZone,
      year: "numeric",
    }).format(new Date())
  );
}

function boundedNumber(
  value: unknown,
  minimum: number,
  maximum: number
) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(cleanText(value).replace(/,/g, ""));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}

function splitTerms(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(/[,;\n]/)
    .map((item) => normalizeKeyword(item))
    .filter(Boolean);
}

function normalizeForSimilarity(value: string) {
  return normalizeKeyword(value)
    .replace(/\b(best|top|free|guide|software|apps|app|tools|tool)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function areNearDuplicates(left: string, right: string) {
  const a = normalizeForSimilarity(left);
  const b = normalizeForSimilarity(right);

  if (!a || !b || a === b) {
    return a === b;
  }

  return a.includes(b) || b.includes(a);
}

function appendNotes(existing: string | null | undefined, notes: string[]) {
  const current = existing ? [existing] : [];
  return [...current, ...notes].filter(Boolean).join("\n") || null;
}
