import { prisma } from "@/lib/prisma";

export async function getKeywords() {
  return prisma.keywords.findMany({
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

export async function markKeywordPlanned(keywordId: string) {
  return prisma.keywords.update({
    where: { id: keywordId },
    data: {
      status: "planned",
      content_stage: "planned",
    },
  });
}