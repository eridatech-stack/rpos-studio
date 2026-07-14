import { db } from "@/lib/db";
import { getWordPressAuthHeader, getWordPressConfig } from "@/lib/wordpress";
import { getArticleById } from "@/repositories/articleRepository";
import { createJob, completeJob, failJob } from "@/repositories/jobRepository";

function markdownToBasicHtml(markdown: string) {
  return markdown
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h2>$1</h2>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\n\n/gim, "</p><p>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

export async function publishArticleToWordPressDraft(
  articleId: string,
  input: {
    featuredMediaId?: number | null;
  } = {}
) {
  const article: any = await getArticleById(articleId);

  if (!article) {
    throw new Error("Article not found.");
  }

  if (!article.draft_markdown) {
    throw new Error("Article has no draft_markdown.");
  }

  const jobId = await createJob({
    siteId: article.site_id,
    jobType: "wordpress_draft",
    relatedArticleId: article.id,
    inputData: {
      title: article.title,
      slug: article.slug,
    },
  });

  try {
    const wp = getWordPressConfig();

    const contentHtml = markdownToBasicHtml(article.draft_markdown);

    const response = await fetch(`${wp.url}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        Authorization: getWordPressAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: article.title,
        slug: article.slug,
        status: "draft",
        content: contentHtml,
        excerpt: article.meta_description || "",
        featured_media: input.featuredMediaId ?? undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WordPress error: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    await db.query(
      `
      UPDATE articles
      SET wordpress_post_id = ?,
          wordpress_draft_url = ?,
          status = 'wordpress_draft',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [result.id, result.link, article.id]
    );

    await completeJob(jobId, {
      wordpressPostId: result.id,
      wordpressDraftUrl: result.link,
    });

    return {
      wordpressPostId: result.id,
      wordpressDraftUrl: result.link,
    };
  } catch (error: any) {
    await failJob(jobId, error.message || "WordPress draft creation failed.");
    throw error;
  }
}
