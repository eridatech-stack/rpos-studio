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
  const article = await prisma.articles.create({
    data: {
      site_id: input.siteId,
      category_id: input.categoryId,
      cluster_id: input.clusterId,
      primary_keyword_id: input.keywordId,
      title: input.title,
      slug: input.slug,
      article_type: input.articleType as any,
      intent: input.intent as any,
      status: "outline_ready",
      target_word_count: input.targetWordCount,
      outline: JSON.stringify({ outline: input.outline, faq: input.faqs }, null, 2),
      meta_title: input.metaTitle,
      meta_description: input.metaDescription,
      internal_links: input.internalLinks,
      external_sources: input.externalSources,
      affiliate_opportunities: input.affiliateOpportunities,
    },
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

export async function getArticles() {
  return prisma.articles.findMany({
    orderBy: { created_at: "desc" },
    include: {
      categories: true,
      topic_clusters: true,
      keywords: true,
    },
  });
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

  return {
    ...article,
    article_sections: sections,
    article_faqs: faqs,
  };
}