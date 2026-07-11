import { randomUUID } from "crypto";
import { db } from "@/lib/db";

type SeedKeyword = {
  keyword: string;
  categorySlug: string;
  clusterSlug: string;
  intent: "informational" | "commercial" | "transactional" | "navigational";
  articleType:
    | "pillar"
    | "cluster"
    | "faq"
    | "review"
    | "comparison"
    | "news"
    | "how_to";
  searchVolume: number;
  difficulty: number;
  opportunityScore: number;
  priority: "high" | "medium" | "low";
};

const seedKeywords: SeedKeyword[] = [
  {
    keyword: "best ai tools for small business",
    categorySlug: "ai",
    clusterSlug: "ai-tools",
    intent: "commercial",
    articleType: "comparison",
    searchVolume: 5400,
    difficulty: 32,
    opportunityScore: 88,
    priority: "high",
  },
  {
    keyword: "best free ai tools for work",
    categorySlug: "ai",
    clusterSlug: "ai-tools",
    intent: "commercial",
    articleType: "comparison",
    searchVolume: 4400,
    difficulty: 29,
    opportunityScore: 91,
    priority: "high",
  },
  {
    keyword: "chatgpt alternatives for business",
    categorySlug: "ai",
    clusterSlug: "ai-tools",
    intent: "commercial",
    articleType: "comparison",
    searchVolume: 3600,
    difficulty: 35,
    opportunityScore: 84,
    priority: "high",
  },
  {
    keyword: "how to use chatgpt for marketing",
    categorySlug: "ai",
    clusterSlug: "chatgpt",
    intent: "informational",
    articleType: "how_to",
    searchVolume: 6600,
    difficulty: 29,
    opportunityScore: 90,
    priority: "high",
  },
  {
    keyword: "chatgpt prompts for customer service",
    categorySlug: "ai",
    clusterSlug: "chatgpt",
    intent: "informational",
    articleType: "how_to",
    searchVolume: 1600,
    difficulty: 17,
    opportunityScore: 92,
    priority: "high",
  },
  {
    keyword: "chatgpt prompts for sales",
    categorySlug: "ai",
    clusterSlug: "chatgpt",
    intent: "informational",
    articleType: "how_to",
    searchVolume: 1900,
    difficulty: 19,
    opportunityScore: 91,
    priority: "high",
  },
  {
    keyword: "prompt engineering examples for beginners",
    categorySlug: "ai",
    clusterSlug: "prompt-engineering",
    intent: "informational",
    articleType: "how_to",
    searchVolume: 2900,
    difficulty: 20,
    opportunityScore: 93,
    priority: "high",
  },
  {
    keyword: "how to write effective ai prompts",
    categorySlug: "ai",
    clusterSlug: "prompt-engineering",
    intent: "informational",
    articleType: "how_to",
    searchVolume: 2400,
    difficulty: 22,
    opportunityScore: 90,
    priority: "high",
  },
  {
    keyword: "best password managers for families",
    categorySlug: "technology",
    clusterSlug: "cybersecurity",
    intent: "commercial",
    articleType: "comparison",
    searchVolume: 2800,
    difficulty: 38,
    opportunityScore: 78,
    priority: "medium",
  },
  {
    keyword: "how to protect yourself from online scams",
    categorySlug: "technology",
    clusterSlug: "cybersecurity",
    intent: "informational",
    articleType: "how_to",
    searchVolume: 3200,
    difficulty: 27,
    opportunityScore: 87,
    priority: "high",
  },
  {
    keyword: "best productivity apps for remote work",
    categorySlug: "productivity",
    clusterSlug: "productivity-apps",
    intent: "commercial",
    articleType: "comparison",
    searchVolume: 4100,
    difficulty: 33,
    opportunityScore: 85,
    priority: "high",
  },
  {
    keyword: "best free task management apps",
    categorySlug: "productivity",
    clusterSlug: "productivity-apps",
    intent: "commercial",
    articleType: "comparison",
    searchVolume: 3600,
    difficulty: 31,
    opportunityScore: 86,
    priority: "high",
  },
];

export async function seedApprovedKeywords(siteDomain = "https://rithm.info") {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [siteRows]: any = await connection.query(
      `
      SELECT id
      FROM sites
      WHERE domain = ?
      LIMIT 1
      `,
      [siteDomain]
    );

    if (!siteRows.length) {
      throw new Error(`Site not found: ${siteDomain}`);
    }

    const siteId = siteRows[0].id;

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of seedKeywords) {
      const [categoryRows]: any = await connection.query(
        `
        SELECT id
        FROM categories
        WHERE site_id = ?
          AND slug = ?
        LIMIT 1
        `,
        [siteId, item.categorySlug]
      );

      const [clusterRows]: any = await connection.query(
        `
        SELECT id
        FROM topic_clusters
        WHERE site_id = ?
          AND slug = ?
        LIMIT 1
        `,
        [siteId, item.clusterSlug]
      );

      if (!categoryRows.length || !clusterRows.length) {
        skipped += 1;
        continue;
      }

      const [existingRows]: any = await connection.query(
        `
        SELECT id
        FROM keywords
        WHERE site_id = ?
          AND keyword = ?
        LIMIT 1
        `,
        [siteId, item.keyword]
      );

      if (existingRows.length) {
        await connection.query(
          `
          UPDATE keywords
          SET
            category_id = ?,
            cluster_id = ?,
            intent = ?,
            article_type = ?,
            search_volume = ?,
            difficulty = ?,
            opportunity_score = ?,
            priority = ?,
            status = 'approved',
            content_stage = 'keyword',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [
            categoryRows[0].id,
            clusterRows[0].id,
            item.intent,
            item.articleType,
            item.searchVolume,
            item.difficulty,
            item.opportunityScore,
            item.priority,
            existingRows[0].id,
          ]
        );

        updated += 1;
        continue;
      }

      await connection.query(
        `
        INSERT INTO keywords (
          id,
          site_id,
          category_id,
          cluster_id,
          keyword,
          intent,
          search_volume,
          difficulty,
          opportunity_score,
          priority,
          status,
          article_type,
          content_stage,
          created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, 'keyword', 'manual')
        `,
        [
          randomUUID(),
          siteId,
          categoryRows[0].id,
          clusterRows[0].id,
          item.keyword,
          item.intent,
          item.searchVolume,
          item.difficulty,
          item.opportunityScore,
          item.priority,
          item.articleType,
        ]
      );

      inserted += 1;
    }

    await connection.commit();

    return {
      inserted,
      updated,
      skipped,
      total: seedKeywords.length,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}