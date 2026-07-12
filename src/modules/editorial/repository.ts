import { db } from "@/lib/db";

export async function getReviewQueue() {
  const [rows]: any = await db.query(`
    SELECT
      a.id,
      a.title,
      a.slug,
      a.status,
      a.target_word_count,
      a.wordpress_post_id,
      a.wordpress_draft_url,
      a.created_at,
      a.updated_at,
      k.keyword,
      c.name AS category,
      tc.name AS cluster
    FROM articles a
    LEFT JOIN keywords k
      ON k.id = a.primary_keyword_id
    LEFT JOIN categories c
      ON c.id = a.category_id
    LEFT JOIN topic_clusters tc
      ON tc.id = a.cluster_id
    WHERE a.status = 'wordpress_draft'
    ORDER BY a.updated_at ASC, a.created_at ASC
  `);

  return rows;
}

export async function approveArticleForPublishing(articleId: string) {
  const [result]: any = await db.query(
    `
    UPDATE articles
    SET
      status = 'approved',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND status = 'wordpress_draft'
    `,
    [articleId]
  );

  if (result.affectedRows === 0) {
    throw new Error(
      "Article was not found or is no longer waiting for review."
    );
  }
}

export async function getPublishingQueue() {
  const [rows]: any = await db.query(`
    SELECT
      a.id,
      a.title,
      a.slug,
      a.status,
      a.target_word_count,
      a.wordpress_post_id,
      a.wordpress_draft_url,
      a.published_url,
      a.created_at,
      a.updated_at,
      k.keyword,
      c.name AS category,
      tc.name AS cluster
    FROM articles a
    LEFT JOIN keywords k
      ON k.id = a.primary_keyword_id
    LEFT JOIN categories c
      ON c.id = a.category_id
    LEFT JOIN topic_clusters tc
      ON tc.id = a.cluster_id
    WHERE a.status = 'approved'
    ORDER BY a.updated_at ASC, a.created_at ASC
  `);

  return rows;
}

export async function getApprovedArticleForPublishing(
  articleId: string
) {
  const [rows]: any = await db.query(
    `
    SELECT
      id,
      title,
      status,
      wordpress_post_id,
      wordpress_draft_url
    FROM articles
    WHERE id = ?
      AND status = 'approved'
    LIMIT 1
    `,
    [articleId]
  );

  return rows[0] ?? null;
}

export async function markArticlePublished(
  articleId: string,
  publishedUrl: string
) {
  const [result]: any = await db.query(
    `
    UPDATE articles
    SET
      status = 'published',
      published_url = ?,
      publish_date = CURRENT_DATE,
      last_updated = CURRENT_DATE,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND status = 'approved'
    `,
    [publishedUrl, articleId]
  );

  if (result.affectedRows === 0) {
    throw new Error(
      "Article was not found or is no longer approved for publishing."
    );
  }
}