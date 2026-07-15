import { db } from "@/lib/db";
import { getArticleById } from "@/repositories/articleRepository";
import {
  buildAutomatedReview,
  mergeEditorNotes,
} from "@/modules/editorial/automatedReview";
import {
  isQualityReviewPassed,
  parseQualityReview,
  type QualityReviewChecks,
} from "@/modules/editorial/qualityReview";

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
      a.editor_notes,
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
  const [articleRows]: any = await db.query(
    `
    SELECT id, status, editor_notes
    FROM articles
    WHERE id = ?
    LIMIT 1
    `,
    [articleId]
  );

  const article = articleRows[0];

  if (
    !article ||
    !["wordpress_draft", "human_review"].includes(article.status)
  ) {
    throw new Error(
      "Article was not found or is no longer waiting for review."
    );
  }

  const qualityReview = parseQualityReview(article.editor_notes);

  if (!isQualityReviewPassed(qualityReview)) {
    throw new Error(
      "Complete the quality checklist before approving this article for publishing."
    );
  }

  const [result]: any = await db.query(
    `
    UPDATE articles
    SET
      status = 'approved',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND status IN ('wordpress_draft', 'human_review')
    `,
    [articleId]
  );

  if (result.affectedRows === 0) {
    throw new Error(
      "Article was not found or is no longer waiting for review."
    );
  }
}

export async function saveArticleQualityReview(
  articleId: string,
  input: {
    checks: QualityReviewChecks;
    notes: string;
  }
) {
  const [articleRows]: any = await db.query(
    `
    SELECT editor_notes
    FROM articles
    WHERE id = ?
    LIMIT 1
    `,
    [articleId]
  );

  const editorNotes = mergeEditorNotes(
    articleRows[0]?.editor_notes,
    {
      qualityReview: {
        checks: input.checks,
        notes: input.notes,
        updatedAt: new Date().toISOString(),
      },
    }
  );

  const [result]: any = await db.query(
    `
    UPDATE articles
    SET
      editor_notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND status IN ('wordpress_draft', 'human_review', 'approved')
    `,
    [editorNotes, articleId]
  );

  if (result.affectedRows === 0) {
    throw new Error(
      "Article was not found or cannot be quality-reviewed in its current status."
    );
  }
}

export async function runAutomatedArticleReview(articleId: string) {
  const article = await getArticleById(articleId);

  if (!article) {
    throw new Error("Article not found.");
  }

  if (!article.draft_markdown) {
    throw new Error("Article has no draft content to review.");
  }

  const automatedReview = buildAutomatedReview(article);
  const editorNotes = mergeEditorNotes(article.editor_notes, {
    automatedReview,
  });

  const [result]: any = await db.query(
    `
    UPDATE articles
    SET
      editor_notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND status IN ('draft_ready', 'wordpress_draft', 'human_review', 'approved')
    `,
    [editorNotes, articleId]
  );

  if (result.affectedRows === 0) {
    throw new Error(
      "Article was not found or cannot be reviewed in its current status."
    );
  }

  return automatedReview;
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
