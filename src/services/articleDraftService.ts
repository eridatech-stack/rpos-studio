import { db } from "@/lib/db";
import { openai } from "@/lib/openai";
import { getArticleById } from "@/repositories/articleRepository";
import { createJob, completeJob, failJob } from "@/repositories/jobRepository";
import { renderPrompt } from "@/services/promptService";

export async function generateArticleDraft(articleId: string) {
  const article: any = await getArticleById(articleId);

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

    const prompt = await renderPrompt(article.site_id, "article_draft", {
      title: article.title,
      keyword: article.keywords?.keyword ?? "",
      category: article.categories?.name ?? "",
      cluster: article.topic_clusters?.name ?? "",
      target_word_count: article.target_word_count ?? 1800,
      outline: outlineText,
    });

    const response = await openai.chat.completions.create({
      model: prompt.model,
      messages: [{ role: "user", content: prompt.text }],
      temperature: prompt.temperature,
    });

    const markdown = response.choices[0]?.message?.content || "";

    await db.query(
      `
      UPDATE articles
      SET draft_markdown = ?,
          status = 'draft_ready',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [markdown, article.id]
    );

    await completeJob(jobId, {
      articleId: article.id,
      status: "draft_ready",
    });

    return article.id;
  } catch (error: any) {
    await failJob(jobId, error.message || "Draft generation failed.");
    throw error;
  }
}