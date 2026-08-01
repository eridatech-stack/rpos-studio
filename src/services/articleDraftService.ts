import { db } from "@/lib/db";
import { getArticleById } from "@/repositories/articleRepository";
import { createJob, completeJob, failJob } from "@/repositories/jobRepository";
import {
  applyExternalLinksToMarkdown,
  buildExternalSourcePromptText,
  getExternalSourceSuggestions,
} from "@/services/externalLinkService";
import {
  applyInternalLinksToMarkdown,
  buildInternalLinkPromptText,
  getResolvedInternalLinkSuggestions,
} from "@/services/internalLinkService";
import { renderPrompt } from "@/services/promptService";
import { generateText } from "@/services/textGenerationService";
import { type AiProvider } from "@/services/aiUsage";

export async function generateArticleDraft(
  articleId: string,
  options: {
    regenerate?: boolean;
    aiProvider?: AiProvider;
    aiModel?: string;
  } = {}
) {
  const article: any = await getArticleById(articleId);
  let promptMetadata:
    | ReturnType<typeof buildPromptMetadata>
    | null = null;

  if (!article) {
    throw new Error("Article not found.");
  }

  const jobId = await createJob({
    siteId: article.site_id,
    jobType: "generate_draft",
    relatedArticleId: article.id,
    inputData: {
      title: article.title,
      keyword: article.keywords?.keyword,
      aiProvider: options.aiProvider || null,
      aiModel: options.aiModel || null,
    },
  });

  try {
    const outlineText = article.article_sections
      .map(
        (section: any) =>
          `${section.section_order}. ${section.heading}\nPurpose: ${section.purpose}`
      )
      .join("\n\n");
    const internalLinkSuggestions =
      await getResolvedInternalLinkSuggestions(article);
    const externalSourceSuggestions =
      getExternalSourceSuggestions(article.external_sources);

    const prompt = await renderPrompt(article.site_id, "article_draft", {
      title: article.title,
      keyword: article.keywords?.keyword ?? "",
      category: article.categories?.name ?? "",
      cluster: article.topic_clusters?.name ?? "",
      target_word_count: article.target_word_count ?? 1800,
      meta_description: article.meta_description ?? "",
      internal_links: buildInternalLinkPromptText(
        internalLinkSuggestions
      ),
      external_sources: buildExternalSourcePromptText(
        externalSourceSuggestions
      ),
      outline: outlineText,
    });
    promptMetadata = buildPromptMetadata(prompt);

    const result = await generateText({
      provider: options.aiProvider || prompt.provider,
      model: options.aiModel || prompt.model,
      prompt: prompt.text,
      temperature: prompt.temperature,
    });

    const markdown = applyExternalLinksToMarkdown(
      applyInternalLinksToMarkdown(
        result.content,
        internalLinkSuggestions
      ),
      externalSourceSuggestions
    );
    const nextStatus = getNextDraftStatus({
      currentStatus: article.status,
      hasWordPressDraft: Boolean(article.wordpress_post_id),
      regenerate: Boolean(options.regenerate),
    });

    await db.query(
      `
      UPDATE articles
      SET draft_markdown = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [markdown, nextStatus, article.id]
    );

    await completeJob(jobId, {
      articleId: article.id,
      status: nextStatus,
      regenerated: Boolean(options.regenerate),
      prompt: promptMetadata,
      aiUsage: result.aiUsage,
      aiProviderOverride: options.aiProvider || null,
      aiModelOverride: options.aiModel || null,
      internalLinksApplied: internalLinkSuggestions.length,
      externalSourcesApplied: externalSourceSuggestions.length,
    });

    return article.id;
  } catch (error: any) {
    await failJob(
      jobId,
      error.message || "Draft generation failed.",
      {
        prompt: promptMetadata,
      }
    );
    throw error;
  }
}

function getNextDraftStatus(input: {
  currentStatus: string;
  hasWordPressDraft: boolean;
  regenerate: boolean;
}) {
  if (!input.regenerate) {
    return "draft_ready";
  }

  if (input.currentStatus === "published") {
    return "published";
  }

  if (
    input.hasWordPressDraft ||
    input.currentStatus === "wordpress_draft" ||
    input.currentStatus === "human_review" ||
    input.currentStatus === "approved"
  ) {
    return "human_review";
  }

  return "draft_ready";
}

function buildPromptMetadata(prompt: {
  id: string;
  promptKey: string;
  name: string;
  version: string | null;
  model: string;
  provider: string;
}) {
  return {
    id: prompt.id,
    key: prompt.promptKey,
    name: prompt.name,
    version: prompt.version,
    provider: prompt.provider,
    model: prompt.model,
  };
}
