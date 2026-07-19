import { db } from "@/lib/db";
import { getOpenAIClient } from "@/lib/openai";
import { getArticleById } from "@/repositories/articleRepository";
import { createJob, completeJob, failJob } from "@/repositories/jobRepository";
import { buildTextAiUsage } from "@/services/aiUsage";
import {
  applyInternalLinksToMarkdown,
  buildInternalLinkPromptText,
  getResolvedInternalLinkSuggestions,
} from "@/services/internalLinkService";
import { renderPrompt } from "@/services/promptService";

export async function generateArticleDraft(
  articleId: string,
  options: {
    regenerate?: boolean;
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
      outline: outlineText,
    });
    promptMetadata = buildPromptMetadata(prompt);

    const openai = getOpenAIClient();
    
    const response = await openai.chat.completions.create({
      model: prompt.model,
      messages: [{ role: "user", content: prompt.text }],
      temperature: prompt.temperature,
    });
    const aiUsage = buildTextAiUsage({
      model: prompt.model,
      usage: response.usage,
    });

    const markdown = applyInternalLinksToMarkdown(
      response.choices[0]?.message?.content || "",
      internalLinkSuggestions
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
      aiUsage,
      internalLinksApplied: internalLinkSuggestions.length,
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
}) {
  return {
    id: prompt.id,
    key: prompt.promptKey,
    name: prompt.name,
    version: prompt.version,
    model: prompt.model,
  };
}
