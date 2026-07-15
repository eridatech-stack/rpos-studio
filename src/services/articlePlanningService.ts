import { getKeywordById, markKeywordPlanned } from "@/repositories/keywordRepository";
import { createArticleFromPlan } from "@/repositories/articleRepository";
import { createJob, completeJob, failJob } from "@/repositories/jobRepository";
import { renderPrompt } from "@/services/promptService";
import { generateJsonWithAIResult } from "@/services/aiService";

function safeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function generateArticlePlan(keywordId: string) {
  const keyword = await getKeywordById(keywordId);
  let promptMetadata:
    | ReturnType<typeof buildPromptMetadata>
    | null = null;

  if (!keyword) {
    throw new Error("Keyword not found.");
  }

  if (keyword.status !== "approved") {
    throw new Error("Only approved keywords can be generated.");
  }

  const jobId = await createJob({
    siteId: keyword.site_id,
    jobType: "generate_outline",
    relatedKeywordId: keyword.id,
    inputData: {
      keyword: keyword.keyword,
      category: keyword.categories?.name ?? "",
      cluster: keyword.topic_clusters?.name ?? "",
    },
  });

  try {
    const prompt = await renderPrompt(keyword.site_id, "article_plan", {
      site_name: keyword.sites?.site_name ?? "",
      domain: keyword.sites?.domain ?? "",
      brand_voice: keyword.sites?.brand_voice ?? "",
      keyword: keyword.keyword,
      category: keyword.categories?.name ?? "",
      cluster: keyword.topic_clusters?.name ?? "",
      intent: keyword.intent ?? "informational",
      article_type: keyword.article_type ?? "cluster",
    });
    promptMetadata = buildPromptMetadata(prompt);

    const { data: plan, aiUsage } = await generateJsonWithAIResult({
      prompt: prompt.text,
      model: prompt.model,
      temperature: prompt.temperature,
    });
    const normalizedPlan = normalizeArticlePlan({
      plan,
      keyword: keyword.keyword,
    });

    const articleId = await createArticleFromPlan({
      siteId: keyword.site_id,
      categoryId: keyword.category_id,
      clusterId: keyword.cluster_id,
      keywordId: keyword.id,
      title: normalizedPlan.title || keyword.keyword,
      slug:
        normalizedPlan.slug ||
        safeSlug(normalizedPlan.title || keyword.keyword),
      articleType:
        normalizedPlan.article_type || keyword.article_type || "cluster",
      intent: keyword.intent || "informational",
      targetWordCount: Number(normalizedPlan.target_word_count || 1800),
      outline: normalizedPlan.outline || [],
      faqs: normalizedPlan.faq || [],
      metaTitle: normalizedPlan.meta_title,
      metaDescription: normalizedPlan.meta_description || "",
      internalLinks: JSON.stringify(
        normalizedPlan.internal_link_suggestions || [],
        null,
        2
      ),
      externalSources: JSON.stringify(
        normalizedPlan.external_source_suggestions || [],
        null,
        2
      ),
      affiliateOpportunities: JSON.stringify(
        normalizedPlan.affiliate_opportunities || [],
        null,
        2
      ),
    });

    await markKeywordPlanned(keywordId);

    await completeJob(jobId, {
      articleId,
      title: normalizedPlan.title,
      slug: normalizedPlan.slug,
      prompt: promptMetadata,
      aiUsage,
    });

    return articleId;
  } catch (error: any) {
    await failJob(
      jobId,
      error.message || "Article plan generation failed.",
      {
        prompt: promptMetadata,
      }
    );
    throw error;
  }
}

function normalizeArticlePlan({
  plan,
  keyword,
}: {
  plan: any;
  keyword: string;
}) {
  const currentYear = getCurrentContentYear();
  const title = containsExplicitYear(keyword)
    ? plan.title
    : replaceStaleYears(plan.title, currentYear);
  const metaTitleSource = containsExplicitYear(keyword)
    ? plan.meta_title
    : replaceStaleYears(plan.meta_title, currentYear);
  const metaDescription = containsExplicitYear(keyword)
    ? plan.meta_description
    : replaceStaleYears(plan.meta_description, currentYear);

  return {
    ...plan,
    title,
    slug: containsExplicitYear(keyword)
      ? plan.slug
      : replaceStaleYears(plan.slug, currentYear),
    meta_title: normalizeMetaTitle(
      metaTitleSource || title || keyword,
      title || keyword,
      keyword
    ),
    meta_description: metaDescription,
  };
}

function normalizeMetaTitle(
  value: unknown,
  titleFallback: string,
  keywordFallback: string
) {
  const raw =
    typeof value === "string" && value.trim()
      ? value.trim()
      : titleFallback || keywordFallback;
  const compact = raw.replace(/\s+/g, " ").trim();

  if (compact.length <= 65) {
    return compact;
  }

  const trimmed = trimToCharacterLimit(compact, 65);

  if (trimmed.length >= 35) {
    return trimmed;
  }

  const fallback = `${keywordFallback} Guide`;

  return fallback.length <= 65
    ? fallback
    : trimToCharacterLimit(fallback, 65);
}

function trimToCharacterLimit(value: string, limit: number) {
  const words = value.split(/\s+/);
  let output = "";

  for (const word of words) {
    const next = output ? `${output} ${word}` : word;

    if (next.length > limit) {
      break;
    }

    output = next;
  }

  return output || value.slice(0, limit).trim();
}

function containsExplicitYear(value: string) {
  return /\b20\d{2}\b/.test(value);
}

function replaceStaleYears(
  value: unknown,
  currentYear: number
) {
  if (typeof value !== "string") {
    return value;
  }

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

function buildPromptMetadata(prompt: {
  id: string;
  promptKey: string;
  name: string;
  version: string | null;
  model: string;
}) {
  return {
    id: prompt.id,
    key: prompt.promptKey,
    name: prompt.name,
    version: prompt.version,
    model: prompt.model,
  };
}
