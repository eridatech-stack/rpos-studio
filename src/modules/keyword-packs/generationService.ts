import { generateJsonWithAIResult } from "@/services/aiService";
import { renderPrompt } from "@/services/promptService";
import {
  addKeywordPackEvent,
  getKeywordPackGenerationContext,
  getKeywordPackStatus,
  getLiveKeywordsForSite,
  replaceKeywordPackCategories,
  replaceKeywordPackClusters,
  replaceKeywordPackItems,
  updateKeywordPackItemRelationships,
  updateKeywordPackProgress,
  type KeywordPackGenerationContext,
} from "@/modules/keyword-packs/repository";
import type {
  KeywordPackCategoryDraft,
  KeywordPackClusterDraft,
  KeywordPackItemDraft,
} from "@/modules/keyword-packs/types";
import {
  buildInternalLinkRelationships,
  normalizeCategoryDraft,
  normalizeClusterDraft,
  normalizeItemDraft,
  safeSlug,
  validateKeywordPackItems,
} from "@/modules/keyword-packs/validation";

const KEYWORD_CHUNK_SIZE = 40;
const MAX_FILL_ATTEMPTS = 3;

type PromptRunResult = {
  data: any;
  prompt: Awaited<ReturnType<typeof renderPrompt>>;
  aiUsage: unknown;
};

export async function generateKeywordPack(keywordPackId: string) {
  const context = await getKeywordPackGenerationContext(keywordPackId);

  if (!context) {
    throw new Error("Keyword pack not found.");
  }

  await ensureNotCancelled(keywordPackId);
  await updateKeywordPackProgress(keywordPackId, {
    status: "running",
    progressPercent: 5,
    currentStep: "strategy",
    errorMessage: null,
    started: true,
  });

  const liveKeywords = await getLiveKeywordsForSite(context.site_id);
  const liveKeywordText = liveKeywords
    .slice(0, 1000)
    .map((item) => item.keyword)
    .join(", ");

  const strategy = await runPromptStage(keywordPackId, {
    stage: "strategy",
    promptKey: "keyword_pack_strategy",
    context,
    variables: {
      live_site_keywords: liveKeywordText,
    },
  });

  await ensureNotCancelled(keywordPackId);
  await updateKeywordPackProgress(keywordPackId, {
    progressPercent: 15,
    currentStep: "categories",
  });

  const categoriesResult = await runPromptStage(keywordPackId, {
    stage: "categories",
    promptKey: "keyword_pack_categories",
    context,
    variables: {
      strategy_json: stringifyForPrompt(strategy.data),
    },
  });
  const categories = normalizeCategories(categoriesResult.data);

  await replaceKeywordPackCategories(keywordPackId, categories);

  await addKeywordPackEvent({
    keywordPackId,
    eventType: "categories_saved",
    status: "running",
    message: "Keyword pack categories saved.",
    details: {
      count: categories.length,
    },
  });

  await ensureNotCancelled(keywordPackId);
  await updateKeywordPackProgress(keywordPackId, {
    progressPercent: 30,
    currentStep: "clusters",
  });

  const clustersResult = await runPromptStage(keywordPackId, {
    stage: "clusters",
    promptKey: "keyword_pack_clusters",
    context,
    variables: {
      strategy_json: stringifyForPrompt(strategy.data),
      categories_json: stringifyForPrompt(categories),
    },
  });
  const clusters = normalizeClusters(clustersResult.data, categories);

  await replaceKeywordPackClusters(keywordPackId, clusters);

  await addKeywordPackEvent({
    keywordPackId,
    eventType: "clusters_saved",
    status: "running",
    message: "Keyword pack topic clusters saved.",
    details: {
      count: clusters.length,
    },
  });

  await ensureNotCancelled(keywordPackId);
  const generatedItems = await generateKeywordChunks({
    keywordPackId,
    context,
    strategy: strategy.data,
    categories,
    clusters,
    liveKeywordText,
  });

  await ensureNotCancelled(keywordPackId);
  await updateKeywordPackProgress(keywordPackId, {
    progressPercent: 90,
    currentStep: "validation",
  });

  const validation = validateKeywordPackItems({
    requestedCount: context.requested_keyword_count,
    items: generatedItems,
    liveKeywords,
    excludedTopics: context.excluded_topics,
  });

  let validatedItems = validation.items;

  if (validation.shortfallCount > 0) {
    validatedItems = await fillKeywordGaps({
      keywordPackId,
      context,
      categories,
      clusters,
      currentItems: validatedItems,
      liveKeywordText,
      neededCount: validation.shortfallCount,
    });
  }

  const finalValidation = validateKeywordPackItems({
    requestedCount: context.requested_keyword_count,
    items: validatedItems,
    liveKeywords,
    excludedTopics: context.excluded_topics,
  });

  await replaceKeywordPackItems(keywordPackId, finalValidation.items);

  await addKeywordPackEvent({
    keywordPackId,
    eventType: "validation_completed",
    status: "running",
    message: "Keyword pack validation completed.",
    details: {
      issueCount: finalValidation.issues.length,
      shortfallCount: finalValidation.shortfallCount,
      issues: finalValidation.issues.slice(0, 50),
    },
  });

  await ensureNotCancelled(keywordPackId);
  await updateKeywordPackProgress(keywordPackId, {
    progressPercent: 97,
    currentStep: "internal_links",
  });

  await runInternalLinkPrompt(keywordPackId, {
    context,
    categories,
    clusters,
    items: finalValidation.items,
  });

  await updateKeywordPackItemRelationships(
    buildInternalLinkRelationships(finalValidation.items)
  );

  await updateKeywordPackProgress(keywordPackId, {
    status: "ready_for_review",
    progressPercent: 100,
    currentStep: null,
    errorMessage: null,
    finished: true,
  });

  await addKeywordPackEvent({
    keywordPackId,
    eventType: "pack_ready_for_review",
    status: "ready_for_review",
    message: "Keyword pack is ready for review.",
    details: {
      generatedCount: finalValidation.items.length,
      requestedCount: context.requested_keyword_count,
    },
  });
}

async function generateKeywordChunks(input: {
  keywordPackId: string;
  context: KeywordPackGenerationContext;
  strategy: unknown;
  categories: KeywordPackCategoryDraft[];
  clusters: KeywordPackClusterDraft[];
  liveKeywordText: string;
}) {
  const items: KeywordPackItemDraft[] = [];
  const totalChunks = Math.ceil(
    input.context.requested_keyword_count / KEYWORD_CHUNK_SIZE
  );

  for (let index = 0; index < totalChunks; index += 1) {
    await ensureNotCancelled(input.keywordPackId);

    const remaining =
      input.context.requested_keyword_count - items.length;
    const chunkSize = Math.min(KEYWORD_CHUNK_SIZE, remaining);
    const progress = Math.min(
      80,
      30 + Math.round(((index + 1) / totalChunks) * 50)
    );

    await updateKeywordPackProgress(input.keywordPackId, {
      progressPercent: progress,
      currentStep: `keyword_chunk_${index + 1}`,
    });

    const result = await runPromptStage(input.keywordPackId, {
      stage: `keyword_chunk_${index + 1}`,
      promptKey: "keyword_pack_items",
      context: input.context,
      variables: {
        strategy_json: stringifyForPrompt(input.strategy),
        categories_json: stringifyForPrompt(input.categories),
        clusters_json: stringifyForPrompt(input.clusters),
        existing_pack_keywords: items
          .map((item) => item.keyword)
          .join(", "),
        live_site_keywords: input.liveKeywordText,
        chunk_size: chunkSize,
      },
    });

    items.push(
      ...normalizeItems(
        result.data,
        input.categories,
        input.clusters
      )
    );

    if (items.length >= input.context.requested_keyword_count) {
      break;
    }
  }

  return items.slice(0, input.context.requested_keyword_count);
}

async function fillKeywordGaps(input: {
  keywordPackId: string;
  context: KeywordPackGenerationContext;
  categories: KeywordPackCategoryDraft[];
  clusters: KeywordPackClusterDraft[];
  currentItems: KeywordPackItemDraft[];
  liveKeywordText: string;
  neededCount: number;
}) {
  let items = [...input.currentItems];
  let neededCount = input.neededCount;

  for (
    let attempt = 1;
    attempt <= MAX_FILL_ATTEMPTS && neededCount > 0;
    attempt += 1
  ) {
    await ensureNotCancelled(input.keywordPackId);

    const result = await runPromptStage(input.keywordPackId, {
      stage: `fill_gaps_${attempt}`,
      promptKey: "keyword_pack_fill_gaps",
      context: input.context,
      variables: {
        categories_json: stringifyForPrompt(input.categories),
        clusters_json: stringifyForPrompt(input.clusters),
        existing_pack_keywords: items
          .map((item) => item.keyword)
          .join(", "),
        live_site_keywords: input.liveKeywordText,
        needed_item_count: neededCount,
      },
    });

    items = [
      ...items,
      ...normalizeItems(result.data, input.categories, input.clusters),
    ];

    const validation = validateKeywordPackItems({
      requestedCount: input.context.requested_keyword_count,
      items,
      liveKeywords: [],
      excludedTopics: input.context.excluded_topics,
    });

    items = validation.items;
    neededCount = validation.shortfallCount;
  }

  return items.slice(0, input.context.requested_keyword_count);
}

async function runInternalLinkPrompt(
  keywordPackId: string,
  input: {
    context: KeywordPackGenerationContext;
    categories: KeywordPackCategoryDraft[];
    clusters: KeywordPackClusterDraft[];
    items: KeywordPackItemDraft[];
  }
) {
  await runPromptStage(keywordPackId, {
    stage: "internal_links",
    promptKey: "keyword_pack_internal_links",
    context: input.context,
    variables: {
      categories_json: stringifyForPrompt(input.categories),
      clusters_json: stringifyForPrompt(input.clusters),
      items_json: stringifyForPrompt(
        input.items.map((item) => ({
          id: item.id,
          keyword: item.keyword,
          categoryId: item.categoryId,
          clusterId: item.clusterId,
          isPillar: item.isPillar,
        }))
      ),
    },
  });
}

async function runPromptStage(
  keywordPackId: string,
  input: {
    stage: string;
    promptKey: string;
    context: KeywordPackGenerationContext;
    variables: Record<string, string | number | null | undefined>;
  }
): Promise<PromptRunResult> {
  const prompt = await renderPrompt(
    input.context.site_id,
    input.promptKey,
    {
      ...basePromptVariables(input.context),
      ...input.variables,
    }
  );

  await addKeywordPackEvent({
    keywordPackId,
    eventType: "stage_started",
    status: "running",
    message: `${input.stage} started.`,
    details: {
      stage: input.stage,
      prompt: promptDetails(prompt),
    },
  });

  const result = await withRetries(() =>
    generateJsonWithAIResult({
      prompt: prompt.text,
      model: prompt.model || "gpt-4.1-mini",
      temperature: Number(prompt.temperature ?? 0.35),
    })
  );

  await addKeywordPackEvent({
    keywordPackId,
    eventType: "stage_completed",
    status: "running",
    message: `${input.stage} completed.`,
    details: {
      stage: input.stage,
      prompt: promptDetails(prompt),
      aiUsage: result.aiUsage,
    },
  });

  return {
    data: result.data,
    prompt,
    aiUsage: result.aiUsage,
  };
}

function normalizeCategories(data: any) {
  const rawCategories = Array.isArray(data?.categories)
    ? data.categories
    : [];

  return rawCategories.map(normalizeCategoryDraft);
}

function normalizeClusters(
  data: any,
  categories: KeywordPackCategoryDraft[]
) {
  const rawClusters = Array.isArray(data?.clusters)
    ? data.clusters
    : [];
  const categoryBySlug = new Map(
    categories.map((category) => [category.slug, category])
  );

  return rawClusters
    .map((cluster: any, index: number) => {
      const categorySlug = safeSlug(cluster?.category_slug || "");
      const category =
        categoryBySlug.get(categorySlug) ||
        categories[index % Math.max(categories.length, 1)];

      if (!category?.id) {
        return null;
      }

      return normalizeClusterDraft(cluster, category.id, index);
    })
    .filter(Boolean) as KeywordPackClusterDraft[];
}

function normalizeItems(
  data: any,
  categories: KeywordPackCategoryDraft[],
  clusters: KeywordPackClusterDraft[]
) {
  const rawItems = Array.isArray(data?.items) ? data.items : [];
  const categoryBySlug = new Map(
    categories.map((category) => [category.slug, category])
  );
  const clusterBySlug = new Map(
    clusters.map((cluster) => [cluster.slug, cluster])
  );

  return rawItems
    .map((item: any) => {
      const categorySlug = safeSlug(item?.category_slug || "");
      const clusterSlug = safeSlug(item?.cluster_slug || "");
      const cluster = clusterBySlug.get(clusterSlug);
      const category =
        categoryBySlug.get(categorySlug) ||
        categories.find((candidate) => candidate.id === cluster?.categoryId);

      if (!cluster?.id || !category?.id) {
        return null;
      }

      return normalizeItemDraft(item, {
        categoryId: category.id,
        clusterId: cluster.id,
      });
    })
    .filter(Boolean) as KeywordPackItemDraft[];
}

async function ensureNotCancelled(keywordPackId: string) {
  const status = await getKeywordPackStatus(keywordPackId);

  if (status === "cancelled") {
    await addKeywordPackEvent({
      keywordPackId,
      eventType: "pack_cancelled",
      status: "cancelled",
      message: "Keyword pack generation stopped after cancellation.",
    });

    throw new Error("Keyword pack generation was cancelled.");
  }
}

async function withRetries<T>(operation: () => Promise<T>) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await sleep(500 * 2 ** (attempt - 1));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("AI generation failed.");
}

function basePromptVariables(context: KeywordPackGenerationContext) {
  return {
    site_name: context.site_name,
    domain: context.domain,
    brand_voice: context.brand_voice || "",
    niche: context.niche,
    target_language:
      context.target_language || context.main_language || "English",
    target_countries: stringifyForPrompt(
      context.target_countries || context.site_target_countries || []
    ),
    audience: context.audience || "",
    business_goal: context.business_goal || "",
    monetization_model: context.monetization_model || "",
    excluded_topics: context.excluded_topics || "",
    preferred_categories: context.preferred_categories || "",
    brand_notes: context.brand_notes || "",
    generation_mode: context.generation_mode,
    requested_keyword_count: context.requested_keyword_count,
    chunk_size: KEYWORD_CHUNK_SIZE,
    needed_item_count: "",
    strategy_json: "",
    categories_json: "",
    clusters_json: "",
    items_json: "",
    existing_pack_keywords: "",
    live_site_keywords: "",
  };
}

function promptDetails(prompt: Awaited<ReturnType<typeof renderPrompt>>) {
  return {
    id: prompt.id,
    key: prompt.promptKey,
    name: prompt.name,
    version: prompt.version,
    model: prompt.model,
  };
}

function stringifyForPrompt(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value ?? null);
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
