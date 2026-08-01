import { stat } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";

export async function createArticleFromPlan(input: {
  siteId: string;
  categoryId: string | null;
  clusterId: string | null;
  keywordId: string;
  title: string;
  slug: string;
  articleType: string;
  intent: string;
  targetWordCount: number;
  outline: any[];
  faqs: any[];
  metaTitle: string;
  metaDescription: string;
  internalLinks: string;
  externalSources: string;
  affiliateOpportunities: string;
}) {
  const baseSlug = normalizeArticleSlug(
    input.slug || input.title
  );
  const initialSlug = await resolveUniqueArticleSlug(
    input.siteId,
    baseSlug
  );

  const article = await createArticleWithSlugRetry({
    input,
    baseSlug,
    initialSlug,
  });

  for (const [index, section] of input.outline.entries()) {
    await db.query(
      `
      INSERT INTO article_sections (
        article_id, section_order, heading, purpose, target_words, status
      )
      VALUES (?, ?, ?, ?, ?, 'planned')
      `,
      [
        article.id,
        index + 1,
        section.heading || `Section ${index + 1}`,
        section.purpose || "",
        Number(section.target_words || 300),
      ]
    );
  }

  for (const [index, faq] of input.faqs.entries()) {
    await db.query(
      `
      INSERT INTO article_faqs (
        article_id, faq_order, question, answer_goal, status
      )
      VALUES (?, ?, ?, ?, 'planned')
      `,
      [
        article.id,
        index + 1,
        faq.question || `FAQ ${index + 1}`,
        faq.answer_goal || "",
      ]
    );
  }

  return article.id;
}

async function createArticleWithSlugRetry({
  input,
  baseSlug,
  initialSlug,
}: {
  input: Parameters<typeof createArticleFromPlan>[0];
  baseSlug: string;
  initialSlug: string;
}) {
  let slug = initialSlug;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return await prisma.articles.create({
        data: {
          site_id: input.siteId,
          category_id: input.categoryId,
          cluster_id: input.clusterId,
          primary_keyword_id: input.keywordId,
          title: input.title,
          slug,
          article_type: input.articleType as any,
          intent: input.intent as any,
          status: "outline_ready",
          target_word_count: input.targetWordCount,
          outline: JSON.stringify(
            {
              outline: input.outline,
              faq: input.faqs,
            },
            null,
            2
          ),
          meta_title: input.metaTitle,
          meta_description: input.metaDescription,
          internal_links: input.internalLinks,
          external_sources: input.externalSources,
          affiliate_opportunities: input.affiliateOpportunities,
        },
      });
    } catch (error) {
      if (!isArticleSlugUniqueError(error)) {
        throw error;
      }

      slug = await resolveUniqueArticleSlug(
        input.siteId,
        appendSlugSuffix(baseSlug, attempt + 2)
      );
    }
  }

  throw new Error(
    "Unable to create article with a unique slug after 20 attempts."
  );
}

async function resolveUniqueArticleSlug(
  siteId: string,
  requestedSlug: string
) {
  const baseSlug = normalizeArticleSlug(requestedSlug);
  let candidate = baseSlug;
  let suffix = 2;

  while (
    await prisma.articles.findFirst({
      where: {
        site_id: siteId,
        slug: candidate,
      },
      select: {
        id: true,
      },
    })
  ) {
    const suffixText = `-${suffix}`;
    candidate = `${baseSlug.slice(0, 255 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  return candidate;
}

function normalizeArticleSlug(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 255);

  return slug || "article";
}

function appendSlugSuffix(baseSlug: string, suffix: number) {
  const suffixText = `-${suffix}`;

  return `${baseSlug.slice(0, 255 - suffixText.length)}${suffixText}`;
}

function isArticleSlugUniqueError(error: unknown) {
  const prismaError = error as {
    code?: string;
  };

  return prismaError.code === "P2002";
}

export async function getArticles(input: {
  query?: string;
} = {}) {
  const query = input.query?.trim();

  const articles = await prisma.articles.findMany({
    where: query
      ? {
          OR: [
            {
              title: {
                contains: query,
              },
            },
            {
              slug: {
                contains: query,
              },
            },
            {
              meta_title: {
                contains: query,
              },
            },
            {
              meta_description: {
                contains: query,
              },
            },
            {
              editor_notes: {
                contains: query,
              },
            },
            {
              keywords: {
                keyword: {
                  contains: query,
                },
              },
            },
            {
              categories: {
                name: {
                  contains: query,
                },
              },
            },
            {
              topic_clusters: {
                name: {
                  contains: query,
                },
              },
            },
            ...articleEnumSearchFilters(query),
          ],
        }
      : undefined,
    orderBy: { created_at: "desc" },
    include: {
      categories: true,
      topic_clusters: true,
      keywords: true,
    },
  });

  const articleIds = articles.map((article) => article.id);

  if (articleIds.length === 0) {
    return articles;
  }

  const [socialRows]: any = await db.query(
    `
    SELECT
      article_id,
      platform,
      status,
      link_url,
      provider_post_id,
      error_message,
      updated_at
    FROM social_posts
    WHERE platform = 'facebook'
      AND article_id IN (?)
    `,
    [articleIds]
  );
  const facebookStatusByArticleId = new Map(
    socialRows.map((row: any) => [row.article_id, row])
  );

  return articles.map((article) => ({
    ...article,
    facebook_social_post:
      facebookStatusByArticleId.get(article.id) ?? null,
  }));
}

function articleEnumSearchFilters(query: string) {
  const normalized = query.toLowerCase().replaceAll(" ", "_");
  const filters: any[] = [];
  const enumValuesByField: Record<string, string[]> = {
    article_type: [
      "pillar",
      "cluster",
      "faq",
      "review",
      "comparison",
      "news",
      "how_to",
    ],
    intent: [
      "informational",
      "commercial",
      "transactional",
      "navigational",
    ],
    status: [
      "idea",
      "approved",
      "outline_ready",
      "draft_ready",
      "seo_ready",
      "image_ready",
      "wordpress_draft",
      "human_review",
      "published",
      "needs_update",
      "archived",
    ],
  };

  for (const [field, values] of Object.entries(enumValuesByField)) {
    if (!values.includes(normalized)) {
      continue;
    }

    filters.push({
      [field]: normalized,
    });
  }

  return filters;
}

export async function getArticleById(articleId: string) {
  const article: any = await prisma.articles.findUnique({
    where: { id: articleId },
    include: {
      sites: true,
      categories: true,
      topic_clusters: true,
      keywords: true,
    },
  });

  if (!article) return null;

  const [sections]: any = await db.query(
    `
    SELECT *
    FROM article_sections
    WHERE article_id = ?
    ORDER BY section_order ASC
    `,
    [articleId]
  );

  const [faqs]: any = await db.query(
    `
    SELECT *
    FROM article_faqs
    WHERE article_id = ?
    ORDER BY faq_order ASC
    `,
    [articleId]
  );

  const [images]: any = await db.query(
    `
    SELECT *
    FROM images
    WHERE article_id = ?
    ORDER BY created_at DESC
    `,
    [articleId]
  );
  const [socialPosts]: any = await db.query(
    `
    SELECT *
    FROM social_posts
    WHERE article_id = ?
    ORDER BY created_at DESC
    `,
    [articleId]
  );
  const [aiGenerationJobs]: any = await db.query(
    `
    SELECT
      id,
      job_type,
      status,
      output_data,
      error_message,
      started_at,
      finished_at,
      created_at
    FROM jobs
    WHERE job_type IN ('generate_outline', 'generate_draft')
      AND (
        related_article_id = ?
        OR (
          related_keyword_id = ?
          AND JSON_UNQUOTE(
            JSON_EXTRACT(output_data, '$.articleId')
          ) = ?
        )
      )
    ORDER BY created_at DESC
    LIMIT 6
    `,
    [articleId, article.primary_keyword_id, articleId]
  );
  const imagesWithFileSizes = await Promise.all(
    images.map(async (image: any) => ({
      ...image,
      file_size_bytes: await getLocalGeneratedImageSize(
        image.file_url
      ),
    }))
  );

  return {
    ...article,
    article_sections: sections,
    article_faqs: faqs,
    images: imagesWithFileSizes,
    social_posts: socialPosts,
    ai_generation_jobs: aiGenerationJobs.map(
      normalizeAiGenerationJob
    ),
  };
}

function normalizeAiGenerationJob(job: any) {
  const outputData = parseJsonValue(job.output_data);
  const aiUsage = outputData?.aiUsage || null;
  const prompt = outputData?.prompt || null;

  return {
    id: job.id,
    job_type: job.job_type,
    status: job.status,
    error_message: job.error_message,
    started_at: job.started_at,
    finished_at: job.finished_at,
    created_at: job.created_at,
    provider: normalizeAiProvider(
      aiUsage?.provider || prompt?.provider,
      aiUsage?.model || prompt?.model
    ),
    model: aiUsage?.model || prompt?.model || null,
    prompt_name: prompt?.name || null,
    prompt_version: prompt?.version || null,
    estimated_cost_usd:
      typeof aiUsage?.estimatedCostUsd === "number"
        ? aiUsage.estimatedCostUsd
        : null,
    prompt_tokens:
      typeof aiUsage?.promptTokens === "number"
        ? aiUsage.promptTokens
        : null,
    completion_tokens:
      typeof aiUsage?.completionTokens === "number"
        ? aiUsage.completionTokens
        : null,
  };
}

function parseJsonValue(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value as any;
  }

  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function normalizeAiProvider(
  provider: unknown,
  model: unknown
) {
  const normalizedProvider = String(provider || "")
    .trim()
    .toLowerCase();

  if (
    normalizedProvider === "anthropic" ||
    normalizedProvider === "claude"
  ) {
    return "anthropic";
  }

  return String(model || "")
    .trim()
    .toLowerCase()
    .startsWith("claude-")
    ? "anthropic"
    : "openai";
}

async function getLocalGeneratedImageSize(fileUrl: string | null) {
  if (
    !fileUrl ||
    !fileUrl.startsWith("/generated-images/")
  ) {
    return null;
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    "generated-images",
    path.basename(fileUrl)
  );

  try {
    const file = await stat(filePath);
    return file.size;
  } catch {
    return null;
  }
}

export async function deleteNonPublishedArticleAndRestoreKeyword(
  articleId: string
) {
  return prisma.$transaction(async (transaction) => {
    const article = await transaction.articles.findUnique({
      where: {
        id: articleId,
      },
      select: {
        id: true,
        title: true,
        status: true,
        primary_keyword_id: true,
      },
    });

    if (!article) {
      throw new Error("Article not found.");
    }

    if (article.status === "published") {
      throw new Error("Published articles cannot be deleted.");
    }

    const keywordId = article.primary_keyword_id;

    const jobCleanupConditions = keywordId
      ? [
          {
            related_article_id: article.id,
          },
          {
            related_keyword_id: keywordId,
          },
        ]
      : [
          {
            related_article_id: article.id,
          },
        ];

    await transaction.jobs.updateMany({
      where: {
        OR: jobCleanupConditions,
      },
      data: {
        related_article_id: null,
        related_keyword_id: null,
      },
    });

    if (keywordId) {
      await transaction.production_runs.deleteMany({
        where: {
          OR: [
            {
              article_id: article.id,
            },
            {
              keyword_id: keywordId,
            },
          ],
        },
      });
    } else {
      await transaction.production_runs.deleteMany({
        where: {
          article_id: article.id,
        },
      });
    }

    await transaction.articles.delete({
      where: {
        id: article.id,
      },
    });

    if (keywordId) {
      await transaction.keywords.update({
        where: {
          id: keywordId,
        },
        data: {
          status: "approved",
          content_stage: "keyword",
          updated_at: new Date(),
        },
      });
    }

    return {
      id: article.id,
      title: article.title,
      keywordId,
    };
  });
}
