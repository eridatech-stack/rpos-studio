import { db } from "@/lib/db";
import { getWordPressAuthHeader, getWordPressConfig } from "@/lib/wordpress";
import { getArticleById } from "@/repositories/articleRepository";
import { createJob, completeJob, failJob } from "@/repositories/jobRepository";
import { getUploadedFeaturedImageMediaId } from "@/services/featuredImageService";

function markdownToBasicHtml(markdown: string) {
  return markdown
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h2>$1</h2>")
    .replace(
      /\[([^\]]+)]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/gim,
      (_match, text, url) =>
        `<a href="${escapeHtmlAttribute(url)}">${escapeHtml(text)}</a>`
    )
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\n\n/gim, "</p><p>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlAttribute(value: string) {
  return escapeHtml(value).replace(/"/g, "&quot;");
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
    const wordpressCategoryId =
      await resolveWordPressCategoryId(article);
    const yoastSeo = buildYoastSeoPayload(article);
    const postPayload = await buildWordPressPostPayload({
      article,
      wordpressCategoryId,
      featuredMediaId: input.featuredMediaId,
    });

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

export async function updateWordPressDraft(
  articleId: string
) {
  const article: any = await getArticleById(articleId);

  if (!article) {
    throw new Error("Article not found.");
  }

  if (!article.wordpress_post_id) {
    throw new Error("Article does not have a WordPress draft yet.");
  }

  if (!article.draft_markdown) {
    throw new Error("Article has no draft_markdown.");
  }

  const jobId = await createJob({
    siteId: article.site_id,
    jobType: "wordpress_draft",
    relatedArticleId: article.id,
      inputData: {
      action:
        article.status === "published"
          ? "update_wordpress_post"
          : "update_wordpress_draft",
      title: article.title,
      slug: article.slug,
      wordpressPostId: Number(article.wordpress_post_id),
      category: article.categories?.name ?? null,
    },
  });

  try {
    const wp = getWordPressConfig();
    const wordpressCategoryId =
      await resolveWordPressCategoryId(article);
    const yoastSeo = buildYoastSeoPayload(article);
    const featuredMediaId =
      await getUploadedFeaturedImageMediaId(article.id);
    const postPayload = await buildWordPressPostPayload({
      article,
      wordpressCategoryId,
      featuredMediaId,
      status:
        article.status === "published"
          ? "publish"
          : "draft",
    });

    const response = await updateWordPressDraftPost({
      wpUrl: wp.url,
      wordpressPostId: Number(article.wordpress_post_id),
      payload: postPayload,
      yoastSeo,
    });
    const result = await response.json();

    await db.query(
      `
      UPDATE articles
      SET wordpress_draft_url =
            CASE
              WHEN status = 'published' THEN wordpress_draft_url
              ELSE COALESCE(?, wordpress_draft_url)
            END,
          published_url =
            CASE
              WHEN status = 'published' THEN COALESCE(?, published_url)
              ELSE published_url
            END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [result.link || null, result.link || null, article.id]
    );

    await completeJob(jobId, {
      action:
        article.status === "published"
          ? "update_wordpress_post"
          : "update_wordpress_draft",
      wordpressPostId: result.id,
      wordpressDraftUrl: result.link,
      publishedUrl:
        article.status === "published"
          ? result.link
          : null,
      wordpressCategoryId,
      featuredMediaId,
      commentStatus: "closed",
      yoastSeo,
    });

    return {
      wordpressPostId: result.id,
      wordpressDraftUrl: result.link,
    };
  } catch (error: any) {
    await failJob(
      jobId,
      error.message || "WordPress draft update failed."
    );
    throw error;
  }
}

async function buildWordPressPostPayload(input: {
  article: any;
  wordpressCategoryId: number | null;
  featuredMediaId?: number | null;
  status?: "draft" | "publish";
}) {
  const contentHtml = markdownToBasicHtml(
    removeLeadingDuplicateTitle(
      input.article.draft_markdown,
      input.article.title
    )
  );

  return {
    title: input.article.title,
    slug: input.article.slug,
    status: input.status ?? "draft",
    content: contentHtml,
    excerpt: input.article.meta_description || "",
    categories: input.wordpressCategoryId
      ? [input.wordpressCategoryId]
      : undefined,
    featured_media: input.featuredMediaId ?? undefined,
    comment_status: "closed",
    ping_status: "closed",
  };
}

async function createWordPressDraftPost(input: {
  wpUrl: string;
  payload: Record<string, unknown>;
  yoastSeo: ReturnType<typeof buildYoastSeoPayload>;
}) {
  const endpoint = `${input.wpUrl}/wp-json/wp/v2/posts`;
  const response = await postWordPressDraft(endpoint, {
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

  const fallbackResponse = await postWordPressDraft(endpoint, input.payload);

  if (!fallbackResponse.ok) {
    const fallbackErrorText = await fallbackResponse.text();
    throw new Error(
      `WordPress error: ${fallbackResponse.status} ${fallbackErrorText}`
    );
  }

  return fallbackResponse;
}

async function updateWordPressDraftPost(input: {
  wpUrl: string;
  wordpressPostId: number;
  payload: Record<string, unknown>;
  yoastSeo: ReturnType<typeof buildYoastSeoPayload>;
}) {
  const response = await postWordPressDraft(
    `${input.wpUrl}/wp-json/wp/v2/posts/${input.wordpressPostId}`,
    {
      ...input.payload,
      meta: {
        _yoast_wpseo_title: input.yoastSeo.title,
        _yoast_wpseo_metadesc: input.yoastSeo.description,
        _yoast_wpseo_focuskw: input.yoastSeo.focusKeyword,
      },
    }
  );

  if (response.ok) {
    return response;
  }

  const errorText = await response.text();

  if (!isProtectedMetaError(errorText)) {
    throw new Error(`WordPress error: ${response.status} ${errorText}`);
  }

  const fallbackResponse = await postWordPressDraft(
    `${input.wpUrl}/wp-json/wp/v2/posts/${input.wordpressPostId}`,
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
  endpoint: string,
  payload: Record<string, unknown>
) {
  return fetch(endpoint, {
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
