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

function removeLeadingDuplicateTitle(markdown: string, title: string) {
  const normalizedTitle = normalizeTitle(title);
  const lines = markdown.trimStart().split(/\r?\n/);

  while (lines.length > 0 && lines[0].trim() === "") {
    lines.shift();
  }

  if (lines.length === 0) {
    return markdown;
  }

  const firstLine = lines[0].trim();
  const firstLineTitle = firstLine
    .replace(/^#{1,2}\s+/, "")
    .replace(/^<h1[^>]*>/i, "")
    .replace(/<\/h1>$/i, "")
    .trim();

  if (normalizeTitle(firstLineTitle) !== normalizedTitle) {
    return markdown;
  }

  lines.shift();

  while (lines.length > 0 && lines[0].trim() === "") {
    lines.shift();
  }

  return lines.join("\n");
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
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
      category: article.categories?.name ?? null,
    },
  });

  try {
    const wp = getWordPressConfig();

    const contentHtml = markdownToBasicHtml(
      removeLeadingDuplicateTitle(
        article.draft_markdown,
        article.title
      )
    );
    const wordpressCategoryId =
      await resolveWordPressCategoryId(article);
    const yoastSeo = buildYoastSeoPayload(article);

    const postPayload = {
      title: article.title,
      slug: article.slug,
      status: "draft",
      content: contentHtml,
      excerpt: article.meta_description || "",
      categories: wordpressCategoryId
        ? [wordpressCategoryId]
        : undefined,
      featured_media: input.featuredMediaId ?? undefined,
      comment_status: "closed",
      ping_status: "closed",
    };

    const response = await createWordPressDraftPost({
      wpUrl: wp.url,
      payload: postPayload,
      yoastSeo,
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
      wordpressCategoryId,
      commentStatus: "closed",
      yoastSeo,
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

async function createWordPressDraftPost(input: {
  wpUrl: string;
  payload: Record<string, unknown>;
  yoastSeo: ReturnType<typeof buildYoastSeoPayload>;
}) {
  const response = await postWordPressDraft(input.wpUrl, {
    ...input.payload,
    meta: {
      _yoast_wpseo_title: input.yoastSeo.title,
      _yoast_wpseo_metadesc: input.yoastSeo.description,
      _yoast_wpseo_focuskw: input.yoastSeo.focusKeyword,
    },
  });

  if (response.ok) {
    return response;
  }

  const errorText = await response.text();

  if (!isProtectedMetaError(errorText)) {
    throw new Error(`WordPress error: ${response.status} ${errorText}`);
  }

  const fallbackResponse = await postWordPressDraft(
    input.wpUrl,
    input.payload
  );

  if (!fallbackResponse.ok) {
    const fallbackErrorText = await fallbackResponse.text();
    throw new Error(
      `WordPress error: ${fallbackResponse.status} ${fallbackErrorText}`
    );
  }

  return fallbackResponse;
}

async function postWordPressDraft(
  wpUrl: string,
  payload: Record<string, unknown>
) {
  return fetch(`${wpUrl}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: getWordPressAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

function buildYoastSeoPayload(article: any) {
  return {
    title: article.meta_title || article.title,
    description: article.meta_description || "",
    focusKeyword: article.keywords?.keyword || "",
  };
}

function isProtectedMetaError(errorText: string) {
  return (
    errorText.includes("rest_invalid_param") &&
    (errorText.includes("_yoast_wpseo") ||
      errorText.includes("meta"))
  );
}

async function resolveWordPressCategoryId(article: any) {
  const localCategory = article.categories;

  if (!localCategory) {
    return null;
  }

  const explicitCategoryId = parseWordPressCategoryId(
    localCategory.description
  );

  if (explicitCategoryId) {
    return explicitCategoryId;
  }

  const wp = getWordPressConfig();
  const categoryBySlug = await findWordPressCategory({
    wpUrl: wp.url,
    query: `slug=${encodeURIComponent(localCategory.slug)}`,
  });

  if (categoryBySlug) {
    return categoryBySlug.id;
  }

  const categoryByName = await findWordPressCategory({
    wpUrl: wp.url,
    query: `search=${encodeURIComponent(localCategory.name)}`,
    expectedName: localCategory.name,
  });

  if (categoryByName) {
    return categoryByName.id;
  }

  throw new Error(
    `WordPress category not found for RPOS category "${localCategory.name}" (${localCategory.slug}). Create the category in WordPress or add wp_category_id:<id> to the RPOS category description.`
  );
}

async function findWordPressCategory(input: {
  wpUrl: string;
  query: string;
  expectedName?: string;
}) {
  const response = await fetch(
    `${input.wpUrl}/wp-json/wp/v2/categories?per_page=100&${input.query}`,
    {
      headers: {
        Authorization: getWordPressAuthHeader(),
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `WordPress category lookup failed: ${response.status} ${errorText}`
    );
  }

  const categories = await response.json();

  if (!Array.isArray(categories)) {
    return null;
  }

  if (!input.expectedName) {
    return categories[0] ? { id: Number(categories[0].id) } : null;
  }

  const exact = categories.find(
    (category: any) =>
      String(category.name || "").toLowerCase() ===
      input.expectedName?.toLowerCase()
  );

  return exact ? { id: Number(exact.id) } : null;
}

function parseWordPressCategoryId(description: string | null) {
  if (!description) {
    return null;
  }

  const match = description.match(/\bwp_category_id\s*:\s*(\d+)\b/i);

  return match ? Number(match[1]) : null;
}
