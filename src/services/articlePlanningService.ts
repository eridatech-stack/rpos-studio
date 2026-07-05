import { getKeywordById, markKeywordPlanned } from "@/repositories/keywordRepository";
import { createArticleFromPlan } from "@/repositories/articleRepository";
import { createJob, completeJob, failJob } from "@/repositories/jobRepository";
import { renderPrompt } from "@/services/promptService";
import { generateJsonWithAI } from "@/services/aiService";

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

    const plan = await generateJsonWithAI({
      prompt: prompt.text,
      model: prompt.model,
      temperature: prompt.temperature,
    });

    const articleId = await createArticleFromPlan({
      siteId: keyword.site_id,
      categoryId: keyword.category_id,
      clusterId: keyword.cluster_id,
      keywordId: keyword.id,
      title: plan.title || keyword.keyword,
      slug: plan.slug || safeSlug(plan.title || keyword.keyword),
      articleType: plan.article_type || keyword.article_type || "cluster",
      intent: keyword.intent || "informational",
      targetWordCount: Number(plan.target_word_count || 1800),
      outline: plan.outline || [],
      faqs: plan.faq || [],
      metaTitle: plan.meta_title || plan.title || keyword.keyword,
      metaDescription: plan.meta_description || "",
      internalLinks: JSON.stringify(plan.internal_link_suggestions || [], null, 2),
      externalSources: JSON.stringify(plan.external_source_suggestions || [], null, 2),
      affiliateOpportunities: JSON.stringify(plan.affiliate_opportunities || [], null, 2),
    });

    await markKeywordPlanned(keywordId);

    await completeJob(jobId, {
      articleId,
      title: plan.title,
      slug: plan.slug,
    });

    return articleId;
  } catch (error: any) {
    await failJob(jobId, error.message || "Article plan generation failed.");
    throw error;
  }
}