import { prisma } from "@/lib/prisma";

import type {
  keywords_article_type,
  keywords_intent,
  keywords_priority,
  keywords_status,
} from "@prisma/client";

export async function getKeywords(input: {
  query?: string;
} = {}) {
  const query = input.query?.trim();

  return prisma.keywords.findMany({
    where: query
      ? {
          OR: [
            {
              keyword: {
                contains: query,
              },
            },
            {
              notes: {
                contains: query,
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
            ...enumSearchFilters(query),
          ],
        }
      : undefined,
    orderBy: [
      { opportunity_score: "desc" },
      { created_at: "desc" },
    ],
    include: {
      categories: true,
      topic_clusters: true,
    },
  });
}

function enumSearchFilters(query: string) {
  const normalized = query.toLowerCase().replaceAll(" ", "_");
  const filters: any[] = [];
  const enumValuesByField: Record<string, string[]> = {
    intent: [
      "informational",
      "commercial",
      "transactional",
      "navigational",
    ],
    article_type: [
      "pillar",
      "cluster",
      "faq",
      "review",
      "comparison",
      "news",
      "how_to",
    ],
    priority: ["high", "medium", "low"],
    status: [
      "new",
      "approved",
      "planned",
      "used",
      "rejected",
      "needs_review",
    ],
    content_stage: [
      "keyword",
      "planned",
      "outlined",
      "drafted",
      "review",
      "published",
    ],
    created_by: ["manual", "ai", "import", "api"],
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

export async function getKeywordById(keywordId: string) {
  return prisma.keywords.findUnique({
    where: { id: keywordId },
    include: {
      sites: true,
      categories: true,
      topic_clusters: true,
    },
  });
}

export async function getKeywordEditOptions(siteId: string) {
  const [categories, clusters] = await Promise.all([
    prisma.categories.findMany({
      where: {
        site_id: siteId,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.topic_clusters.findMany({
      where: {
        site_id: siteId,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return {
    categories,
    clusters,
  };
}

export async function updateKeyword(
  keywordId: string,
  input: {
    keyword: string;
    categoryId: string | null;
    clusterId: string | null;
    intent: keywords_intent;
    articleType: keywords_article_type;
    priority: keywords_priority;
    opportunityScore: number | null;
    searchVolume: number | null;
    difficulty: number | null;
    status: keywords_status;
    notes: string | null;
  }
) {
  return prisma.keywords.update({
    where: {
      id: keywordId,
    },
    data: {
      keyword: input.keyword,
      category_id: input.categoryId,
      cluster_id: input.clusterId,
      intent: input.intent,
      article_type: input.articleType,
      priority: input.priority,
      opportunity_score: input.opportunityScore,
      search_volume: input.searchVolume ?? 0,
      difficulty: input.difficulty,
      status: input.status,
      notes: input.notes,
      updated_at: new Date(),
    },
  });
}

export async function deleteKeyword(keywordId: string) {
  return prisma.$transaction(async (transaction) => {
    const keyword = await transaction.keywords.findUnique({
      where: {
        id: keywordId,
      },
      select: {
        id: true,
        keyword: true,
      },
    });

    if (!keyword) {
      throw new Error("Keyword not found.");
    }

    const [linkedArticles, linkedProductionRuns] = await Promise.all([
      transaction.articles.count({
        where: {
          primary_keyword_id: keywordId,
        },
      }),

      transaction.production_runs.count({
        where: {
          keyword_id: keywordId,
        },
      }),
    ]);

    if (linkedArticles > 0) {
      throw new Error(
        `This keyword cannot be deleted because it is linked to ${linkedArticles} article${
          linkedArticles === 1 ? "" : "s"
        }.`
      );
    }

    if (linkedProductionRuns > 0) {
      throw new Error(
        `This keyword cannot be deleted because it is linked to ${linkedProductionRuns} production run${
          linkedProductionRuns === 1 ? "" : "s"
        }.`
      );
    }

    await transaction.keywords.delete({
      where: {
        id: keywordId,
      },
    });

    return keyword;
  });
}

export async function markKeywordPlanned(keywordId: string) {
  return prisma.keywords.update({
    where: { id: keywordId },
    data: {
      status: "planned",
      content_stage: "planned",
    },
  });
}
