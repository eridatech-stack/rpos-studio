import { db } from "@/lib/db";
import {
  getWordPressAuthHeader,
  getWordPressConfig,
} from "@/lib/wordpress";

type FacebookPostRow = {
  id: string;
  article_id: string;
  message: string;
  link_url: string;
};

export async function enqueueFacebookPostForPublishedArticle(
  articleId: string,
  publishedUrl?: string
) {
  const article = await getPublishedArticleContext(articleId);

  if (!article) {
    throw new Error("Published article not found for social distribution.");
  }

  const linkUrl = publishedUrl || article.published_url;

  if (!linkUrl) {
    throw new Error("Published article does not have a live URL.");
  }

  const message = buildFacebookMessage(article, linkUrl);

  await db.query(
    `
    INSERT INTO social_posts (
      id,
      site_id,
      article_id,
      platform,
      status,
      message,
      link_url,
      created_at,
      updated_at
    )
    VALUES (UUID(), ?, ?, 'facebook', 'queued', ?, ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      message =
        CASE
          WHEN status = 'published' THEN message
          ELSE VALUES(message)
        END,
      link_url =
        CASE
          WHEN status = 'published' THEN link_url
          ELSE VALUES(link_url)
        END,
      status =
        CASE
          WHEN status IN ('published', 'running') THEN status
          ELSE 'queued'
        END,
      error_message =
        CASE
          WHEN status = 'published' THEN error_message
          ELSE NULL
        END,
      updated_at = NOW()
    `,
    [article.site_id, article.id, message, linkUrl]
  );
}

export async function processNextQueuedFacebookPost() {
  const post = await claimNextFacebookPost();

  if (!post) {
    return false;
  }

  try {
    const result = await publishFacebookFeedPost({
      articleId: post.article_id,
      message: post.message,
      linkUrl: post.link_url,
    });

    await markFacebookPostPublished(post.id, result.id);

    return true;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Facebook posting failed.";

    await markFacebookPostFailed(post.id, message);
    throw error;
  }
}

async function getPublishedArticleContext(articleId: string) {
  const [rows]: any = await db.query(
    `
    SELECT
      a.id,
      a.site_id,
      a.title,
      a.meta_description,
      a.published_url,
      c.name AS category_name
    FROM articles a
    LEFT JOIN categories c
      ON c.id = a.category_id
    WHERE a.id = ?
      AND a.status = 'published'
    LIMIT 1
    `,
    [articleId]
  );

  return rows[0] ?? null;
}

function buildFacebookMessage(
  article: {
    title: string;
    meta_description?: string | null;
    category_name?: string | null;
  },
  publishedUrl: string
) {
  const parts = [
    article.title,
    article.meta_description,
    article.category_name ? `Topic: ${article.category_name}` : null,
    `Read more: ${publishedUrl}`,
  ]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean);

  return truncateMessage(parts.join("\n\n"), 1000);
}

function truncateMessage(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 1).trimEnd()}…`;
}

async function claimNextFacebookPost() {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [rows]: any = await connection.query(
      `
      SELECT
        id,
        article_id,
        message,
        link_url
      FROM social_posts
      WHERE platform = 'facebook'
        AND status = 'queued'
        AND (scheduled_at IS NULL OR scheduled_at <= NOW())
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
      `
    );

    const post = rows[0] as FacebookPostRow | undefined;

    if (!post) {
      await connection.commit();
      return null;
    }

    await connection.query(
      `
      UPDATE social_posts
      SET
        status = 'running',
        attempt_count = attempt_count + 1,
        error_message = NULL,
        updated_at = NOW()
      WHERE id = ?
      `,
      [post.id]
    );

    await connection.commit();

    return post;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function publishFacebookFeedPost(input: {
  articleId: string;
  message: string;
  linkUrl: string;
}) {
  const config = getFacebookConfig();
  const imageUrl = await getPublicFeaturedImageUrl(input.articleId);
  const message = input.message.includes(input.linkUrl)
    ? input.message
    : `${input.message}\n\n${input.linkUrl}`;

  if (imageUrl) {
    return publishFacebookPhotoPost({
      config,
      caption: message,
      imageUrl,
    });
  }

  const endpoint =
    `https://graph.facebook.com/${config.graphApiVersion}` +
    `/${encodeURIComponent(config.pageId)}/feed`;
  const body = new URLSearchParams({
    message,
    access_token: config.pageAccessToken,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    body,
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Facebook posting failed: ${response.status} ${JSON.stringify(result)}`
    );
  }

  if (!result?.id) {
    throw new Error("Facebook did not return a post id.");
  }

  return {
    id: String(result.id),
  };
}

async function publishFacebookPhotoPost(input: {
  config: ReturnType<typeof getFacebookConfig>;
  caption: string;
  imageUrl: string;
}) {
  const endpoint =
    `https://graph.facebook.com/${input.config.graphApiVersion}` +
    `/${encodeURIComponent(input.config.pageId)}/photos`;
  const body = new URLSearchParams({
    url: input.imageUrl,
    caption: input.caption,
    published: "true",
    access_token: input.config.pageAccessToken,
  });
  const response = await fetch(endpoint, {
    method: "POST",
    body,
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Facebook photo posting failed: ${response.status} ${JSON.stringify(result)}`
    );
  }

  if (!result?.post_id && !result?.id) {
    throw new Error("Facebook did not return a photo or post id.");
  }

  return {
    id: String(result.post_id || result.id),
  };
}

async function getPublicFeaturedImageUrl(articleId: string) {
  const [rows]: any = await db.query(
    `
    SELECT wordpress_media_id
    FROM images
    WHERE article_id = ?
      AND type = 'featured'
      AND status = 'uploaded'
      AND wordpress_media_id IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [articleId]
  );
  const mediaId = rows[0]?.wordpress_media_id;

  if (!mediaId) {
    return "";
  }

  const wp = getWordPressConfig();
  const response = await fetch(
    `${wp.url}/wp-json/wp/v2/media/${Number(mediaId)}`,
    {
      headers: {
        Authorization: getWordPressAuthHeader(),
      },
    }
  );

  if (!response.ok) {
    return "";
  }

  const media = await response.json().catch(() => null);
  const sourceUrl = String(media?.source_url || "");

  return /^https?:\/\//i.test(sourceUrl) ? sourceUrl : "";
}

function getFacebookConfig() {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const graphApiVersion =
    process.env.FACEBOOK_GRAPH_API_VERSION || "v25.0";

  if (!pageId || !pageAccessToken) {
    throw new Error(
      "Facebook posting is not configured. Set FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN."
    );
  }

  return {
    pageId,
    pageAccessToken,
    graphApiVersion,
  };
}

async function markFacebookPostPublished(
  socialPostId: string,
  providerPostId: string
) {
  await db.query(
    `
    UPDATE social_posts
    SET
      status = 'published',
      provider_post_id = ?,
      published_at = NOW(),
      error_message = NULL,
      updated_at = NOW()
    WHERE id = ?
    `,
    [providerPostId, socialPostId]
  );
}

async function markFacebookPostFailed(
  socialPostId: string,
  message: string
) {
  await db.query(
    `
    UPDATE social_posts
    SET
      status = 'failed',
      error_message = ?,
      updated_at = NOW()
    WHERE id = ?
    `,
    [message, socialPostId]
  );
}
