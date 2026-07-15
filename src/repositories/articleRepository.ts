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

  return prisma.articles.findMany({
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

  return {
    ...article,
    article_sections: sections,
    article_faqs: faqs,
    images,
  };
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
