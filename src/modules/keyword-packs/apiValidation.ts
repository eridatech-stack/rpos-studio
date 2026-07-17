import {
  keywordPackArticleTypes,
  keywordPackGenerationModes,
  keywordPackIntents,
  keywordPackPriorities,
  keywordPackReviewStatuses,
  keywordPackSizes,
  type KeywordPackArticleType,
  type KeywordPackGenerationMode,
  type KeywordPackInput,
  type KeywordPackIntent,
  type KeywordPackPriority,
  type KeywordPackReviewStatus,
  type KeywordPackSize,
} from "@/modules/keyword-packs/types";

export function parseKeywordPackInput(body: any): KeywordPackInput {
  const siteId = requiredString(body.siteId, "siteId");
  const name = requiredString(body.name, "name", 255);
  const niche = requiredString(body.niche, "niche", 500);
  const requestedKeywordCount = parsePackSize(body.requestedKeywordCount);

  return {
    siteId,
    name,
    niche,
    targetLanguage: optionalString(body.targetLanguage, 100),
    targetCountries: parseStringList(body.targetCountries),
    audience: optionalString(body.audience, 5000),
    businessGoal: optionalString(body.businessGoal, 5000),
    monetizationModel: optionalString(body.monetizationModel, 5000),
    excludedTopics: optionalString(body.excludedTopics, 5000),
    preferredCategories: optionalString(body.preferredCategories, 5000),
    brandNotes: optionalString(body.brandNotes, 5000),
    generationMode: parseGenerationMode(body.generationMode),
    requestedKeywordCount,
    createdBy: optionalString(body.createdBy, 100),
  };
}

export function parseKeywordPackPatch(body: any) {
  return {
    name:
      body.name === undefined
        ? undefined
        : requiredString(body.name, "name", 255),
    niche:
      body.niche === undefined
        ? undefined
        : requiredString(body.niche, "niche", 500),
    targetLanguage:
      body.targetLanguage === undefined
        ? undefined
        : optionalString(body.targetLanguage, 100),
    targetCountries:
      body.targetCountries === undefined
        ? undefined
        : parseStringList(body.targetCountries),
    audience:
      body.audience === undefined
        ? undefined
        : optionalString(body.audience, 5000),
    businessGoal:
      body.businessGoal === undefined
        ? undefined
        : optionalString(body.businessGoal, 5000),
    monetizationModel:
      body.monetizationModel === undefined
        ? undefined
        : optionalString(body.monetizationModel, 5000),
    excludedTopics:
      body.excludedTopics === undefined
        ? undefined
        : optionalString(body.excludedTopics, 5000),
    preferredCategories:
      body.preferredCategories === undefined
        ? undefined
        : optionalString(body.preferredCategories, 5000),
    brandNotes:
      body.brandNotes === undefined
        ? undefined
        : optionalString(body.brandNotes, 5000),
    generationMode:
      body.generationMode === undefined
        ? undefined
        : parseGenerationMode(body.generationMode),
    requestedKeywordCount:
      body.requestedKeywordCount === undefined
        ? undefined
        : parsePackSize(body.requestedKeywordCount),
  };
}

export function parseReviewStatus(value: unknown): KeywordPackReviewStatus {
  const normalized = String(value || "").trim();

  if (
    keywordPackReviewStatuses.includes(
      normalized as KeywordPackReviewStatus
    )
  ) {
    return normalized as KeywordPackReviewStatus;
  }

  throw new Error("reviewStatus is invalid.");
}

export function parseImportStatus(value: unknown) {
  const normalized = String(value || "needs_review").trim();

  if (normalized === "needs_review" || normalized === "approved") {
    return normalized;
  }

  throw new Error("importStatus must be needs_review or approved.");
}

export function parseItemPatch(body: any) {
  return {
    keyword:
      body.keyword === undefined
        ? undefined
        : requiredString(body.keyword, "keyword", 255).toLowerCase(),
    suggestedTitle:
      body.suggestedTitle === undefined
        ? undefined
        : optionalString(body.suggestedTitle, 500),
    intent:
      body.intent === undefined ? undefined : parseIntent(body.intent),
    articleType:
      body.articleType === undefined
        ? undefined
        : parseArticleType(body.articleType),
    priority:
      body.priority === undefined
        ? undefined
        : parsePriority(body.priority),
    estimatedSearchVolume:
      body.estimatedSearchVolume === undefined
        ? undefined
        : nullableInt(body.estimatedSearchVolume, 0, 10000000),
    estimatedDifficulty:
      body.estimatedDifficulty === undefined
        ? undefined
        : nullableInt(body.estimatedDifficulty, 0, 100),
    aiOpportunityScore:
      body.aiOpportunityScore === undefined
        ? undefined
        : nullableInt(body.aiOpportunityScore, 0, 100),
    notes:
      body.notes === undefined ? undefined : optionalString(body.notes, 5000),
    reviewStatus:
      body.reviewStatus === undefined
        ? undefined
        : parseReviewStatus(body.reviewStatus),
  };
}

function requiredString(value: unknown, field: string, maxLength = 255) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  const text = value.trim();

  if (text.length > maxLength) {
    throw new Error(`${field} must be ${maxLength} characters or fewer.`);
  }

  return text;
}

function optionalString(value: unknown, maxLength: number) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Expected text value.");
  }

  const text = value.trim();

  if (text.length > maxLength) {
    throw new Error(`Text value must be ${maxLength} characters or fewer.`);
  }

  return text || null;
}

function parseStringList(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 50);
  }

  if (typeof value === "string") {
    return value
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 50);
  }

  throw new Error("targetCountries must be a list of text values.");
}

function parsePackSize(value: unknown): KeywordPackSize {
  const size = Number(value);

  if (keywordPackSizes.includes(size as KeywordPackSize)) {
    return size as KeywordPackSize;
  }

  throw new Error("requestedKeywordCount must be 50, 100, 250, 500, or 1000.");
}

function parseGenerationMode(value: unknown): KeywordPackGenerationMode {
  const mode = String(value || "balanced").trim() as KeywordPackGenerationMode;

  if (keywordPackGenerationModes.includes(mode)) {
    return mode;
  }

  throw new Error("generationMode is invalid.");
}

function parseIntent(value: unknown): KeywordPackIntent {
  const intent = String(value || "informational").trim() as KeywordPackIntent;

  if (keywordPackIntents.includes(intent)) {
    return intent;
  }

  throw new Error("intent is invalid.");
}

function parseArticleType(value: unknown): KeywordPackArticleType {
  const articleType = String(value || "cluster")
    .trim()
    .replace(/\s+/g, "_") as KeywordPackArticleType;

  if (keywordPackArticleTypes.includes(articleType)) {
    return articleType;
  }

  throw new Error("articleType is invalid.");
}

function parsePriority(value: unknown): KeywordPackPriority {
  const priority = String(value || "medium").trim() as KeywordPackPriority;

  if (keywordPackPriorities.includes(priority)) {
    return priority;
  }

  throw new Error("priority is invalid.");
}

function nullableInt(value: unknown, minimum: number, maximum: number) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error("Expected numeric value.");
  }

  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}
