export const keywordPackSizes = [50, 100, 250, 500, 1000] as const;
export const keywordPackGenerationModes = [
  "balanced",
  "low_competition",
  "high_traffic",
  "commercial",
  "informational",
] as const;
export const keywordPackReviewStatuses = [
  "pending",
  "approved",
  "rejected",
  "edited",
  "imported",
  "duplicate",
] as const;
export const keywordPackIntents = [
  "informational",
  "commercial",
  "transactional",
  "navigational",
] as const;
export const keywordPackArticleTypes = [
  "pillar",
  "cluster",
  "faq",
  "review",
  "comparison",
  "news",
  "how_to",
] as const;
export const keywordPackPriorities = ["high", "medium", "low"] as const;

export type KeywordPackSize = (typeof keywordPackSizes)[number];

export type KeywordPackGenerationMode =
  (typeof keywordPackGenerationModes)[number];

export type KeywordPackStatus =
  | "draft"
  | "queued"
  | "running"
  | "ready_for_review"
  | "importing"
  | "completed"
  | "failed"
  | "cancelled";

export type KeywordPackReviewStatus =
  (typeof keywordPackReviewStatuses)[number];

export type KeywordPackIntent = (typeof keywordPackIntents)[number];

export type KeywordPackArticleType =
  (typeof keywordPackArticleTypes)[number];

export type KeywordPackPriority = (typeof keywordPackPriorities)[number];

export type KeywordPackInput = {
  siteId: string;
  name: string;
  niche: string;
  targetLanguage?: string | null;
  targetCountries?: string[] | null;
  audience?: string | null;
  businessGoal?: string | null;
  monetizationModel?: string | null;
  excludedTopics?: string | null;
  preferredCategories?: string | null;
  brandNotes?: string | null;
  generationMode: KeywordPackGenerationMode;
  requestedKeywordCount: KeywordPackSize;
  createdBy?: string | null;
};

export type KeywordPackCategoryDraft = {
  id?: string;
  name: string;
  slug: string;
  description?: string | null;
  priority: KeywordPackPriority;
  sortOrder: number;
  status?: KeywordPackReviewStatus;
};

export type KeywordPackClusterDraft = {
  id?: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string | null;
  pillarKeyword?: string | null;
  pillarTitle?: string | null;
  sortOrder: number;
  status?: KeywordPackReviewStatus;
};

export type KeywordPackItemDraft = {
  id?: string;
  categoryId: string;
  clusterId: string;
  keyword: string;
  suggestedTitle?: string | null;
  intent: KeywordPackIntent;
  articleType: KeywordPackArticleType;
  priority: KeywordPackPriority;
  estimatedSearchVolume?: number | null;
  estimatedDifficulty?: number | null;
  aiOpportunityScore?: number | null;
  isPillar: boolean;
  parentPillarItemId?: string | null;
  relatedItemIds?: string[] | null;
  notes?: string | null;
  reviewStatus?: KeywordPackReviewStatus;
  existingKeywordId?: string | null;
};

export type KeywordPackEventInput = {
  keywordPackId: string;
  eventType: string;
  status?: string | null;
  message: string;
  details?: Record<string, unknown> | null;
};
