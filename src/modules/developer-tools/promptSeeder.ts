import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

const featuredImagePrompt = `Create a realistic editorial featured image for a WordPress article.

The image should look like professional magazine photography, not an illustration.

Article title: {{title}}
Primary keyword: {{keyword}}
Category: {{category}}
Topic cluster: {{cluster}}
Summary: {{meta_description}}

Requirements:
- natural photographic realism
- believable lighting and real-world textures
- clean composition with one clear subject
- suitable as a 3:2 WordPress featured image
- no visible words, captions, signs, UI, logos, brand marks, or watermarks
- avoid cartoon, 3D render, vector art, flat illustration, poster art, and surreal imagery`;

export async function seedFeaturedImagePrompt(
  siteDomain = "https://rithm.info"
) {
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

    await connection.query(
      `
      UPDATE prompt_versions
      SET active = FALSE
      WHERE site_id = ?
        AND prompt_key = 'featured_image'
      `,
      [siteId]
    );

    const [existingRows]: any = await connection.query(
      `
      SELECT id
      FROM prompt_versions
      WHERE site_id = ?
        AND prompt_key = 'featured_image'
        AND version = '1.0'
      LIMIT 1
      `,
      [siteId]
    );

    if (existingRows.length > 0) {
      await connection.query(
        `
        UPDATE prompt_versions
        SET
          name = 'Featured Image Prompt',
          prompt_text = ?,
          model = 'gpt-4.1-mini',
          temperature = 0.40,
          output_format = 'plain_text',
          active = TRUE
        WHERE id = ?
        `,
        [featuredImagePrompt, existingRows[0].id]
      );

      await connection.commit();

      return {
        inserted: 0,
        updated: 1,
        promptId: existingRows[0].id,
      };
    }

    const promptId = randomUUID();

    await connection.query(
      `
      INSERT INTO prompt_versions (
        id,
        site_id,
        prompt_key,
        name,
        prompt_text,
        model,
        temperature,
        output_format,
        version,
        active,
        created_at
      )
      VALUES (?, ?, 'featured_image', 'Featured Image Prompt', ?, 'gpt-4.1-mini', 0.40, 'plain_text', '1.0', TRUE, NOW())
      `,
      [promptId, siteId, featuredImagePrompt]
    );

    await connection.commit();

    return {
      inserted: 1,
      updated: 0,
      promptId,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

const keywordPackPrompts = [
  {
    key: "keyword_pack_strategy",
    name: "Keyword Pack Strategy",
    text: `Create the strategy for an SEO keyword pack.

Return strict JSON only.

Site: {{site_name}}
Domain: {{domain}}
Brand voice: {{brand_voice}}
Niche: {{niche}}
Target language: {{target_language}}
Target countries: {{target_countries}}
Audience: {{audience}}
Business goal: {{business_goal}}
Monetization model: {{monetization_model}}
Excluded topics: {{excluded_topics}}
Preferred categories: {{preferred_categories}}
Brand notes: {{brand_notes}}
Requested keyword count: {{requested_keyword_count}}
Generation mode: {{generation_mode}}

Use only these enum values:
- intent: informational, commercial, transactional, navigational
- article_type: pillar, cluster, faq, review, comparison, news, how_to
- priority: high, medium, low

Return:
{
  "niche_summary": "",
  "audience_interpretation": "",
  "target_cluster_count": 0,
  "recommended_keyword_distribution": [],
  "intent_mix": {},
  "pillar_supporting_ratio": "",
  "risks": [],
  "notes": []
}`,
  },
  {
    key: "keyword_pack_categories",
    name: "Keyword Pack Categories",
    text: `Generate category architecture for an SEO keyword pack.

Return strict JSON only.

Site: {{site_name}}
Domain: {{domain}}
Niche: {{niche}}
Strategy JSON: {{strategy_json}}
Preferred categories: {{preferred_categories}}
Excluded topics: {{excluded_topics}}
Requested keyword count: {{requested_keyword_count}}

Use only priority values: high, medium, low.
Avoid excluded topics.

Return:
{
  "categories": [
    {
      "name": "",
      "slug": "",
      "description": "",
      "priority": "medium",
      "keyword_allocation": 0
    }
  ]
}`,
  },
  {
    key: "keyword_pack_clusters",
    name: "Keyword Pack Clusters",
    text: `Generate topic clusters for an SEO keyword pack.

Return strict JSON only.

Site: {{site_name}}
Domain: {{domain}}
Niche: {{niche}}
Categories JSON: {{categories_json}}
Strategy JSON: {{strategy_json}}
Excluded topics: {{excluded_topics}}

Each cluster needs one pillar keyword and one pillar article title.

Return:
{
  "clusters": [
    {
      "category_slug": "",
      "name": "",
      "slug": "",
      "description": "",
      "pillar_keyword": "",
      "pillar_title": "",
      "supporting_article_count": 0
    }
  ]
}`,
  },
  {
    key: "keyword_pack_items",
    name: "Keyword Pack Items",
    text: `Generate a chunk of keyword items for an SEO content architecture.

Return strict JSON only.

Site: {{site_name}}
Domain: {{domain}}
Niche: {{niche}}
Target language: {{target_language}}
Target countries: {{target_countries}}
Audience: {{audience}}
Business goal: {{business_goal}}
Generation mode: {{generation_mode}}
Categories JSON: {{categories_json}}
Clusters JSON: {{clusters_json}}
Previously generated keywords: {{existing_pack_keywords}}
Live site keywords to avoid: {{live_site_keywords}}
Excluded topics: {{excluded_topics}}
Chunk size: {{chunk_size}}

Use only these enum values:
- intent: informational, commercial, transactional, navigational
- article_type: pillar, cluster, faq, review, comparison, news, how_to
- priority: high, medium, low

Metrics are AI estimates only.
Do not duplicate previously generated keywords.
Do not invent unsupported schema fields.

Return:
{
  "items": [
    {
      "keyword": "",
      "suggested_title": "",
      "intent": "informational",
      "article_type": "cluster",
      "priority": "medium",
      "estimated_search_volume": 0,
      "estimated_difficulty": 0,
      "ai_opportunity_score": 0,
      "is_pillar": false,
      "category_slug": "",
      "cluster_slug": "",
      "parent_pillar_keyword": "",
      "notes": ""
    }
  ]
}`,
  },
  {
    key: "keyword_pack_validation",
    name: "Keyword Pack Validation",
    text: `Validate a generated keyword pack.

Return strict JSON only.

Requested keyword count: {{requested_keyword_count}}
Categories JSON: {{categories_json}}
Clusters JSON: {{clusters_json}}
Items JSON: {{items_json}}
Excluded topics: {{excluded_topics}}
Live site keywords: {{live_site_keywords}}

Validate:
- exact duplicates
- near duplicates
- unsupported enum values
- clusters missing a pillar
- supporting items missing a parent pillar
- excluded topic violations
- existing live keyword duplicates

Return:
{
  "valid": true,
  "issues": [],
  "duplicates": [],
  "near_duplicates": [],
  "existing_site_duplicates": [],
  "shortfall_count": 0,
  "recommended_fixes": []
}`,
  },
  {
    key: "keyword_pack_fill_gaps",
    name: "Keyword Pack Fill Gaps",
    text: `Fill gaps in a generated keyword pack.

Return strict JSON only.

Niche: {{niche}}
Generation mode: {{generation_mode}}
Categories JSON: {{categories_json}}
Clusters JSON: {{clusters_json}}
Existing pack keywords: {{existing_pack_keywords}}
Live site keywords to avoid: {{live_site_keywords}}
Excluded topics: {{excluded_topics}}
Needed item count: {{needed_item_count}}

Use only supported enum values:
- intent: informational, commercial, transactional, navigational
- article_type: pillar, cluster, faq, review, comparison, news, how_to
- priority: high, medium, low

Return:
{
  "items": []
}`,
  },
  {
    key: "keyword_pack_internal_links",
    name: "Keyword Pack Internal Links",
    text: `Create an internal-link planning map for a generated keyword pack.

Return strict JSON only.

Categories JSON: {{categories_json}}
Clusters JSON: {{clusters_json}}
Items JSON: {{items_json}}

Create relationships:
- supporting article to cluster pillar
- pillar to selected supporting articles
- related supporting articles within a cluster
- optional cross-cluster links in the same category

Return:
{
  "links": [
    {
      "source_keyword": "",
      "target_keywords": [],
      "relationship": "",
      "notes": ""
    }
  ]
}`,
  },
];

export async function seedKeywordPackPrompts(
  siteDomain = "https://rithm.info"
) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [siteRows]: any = await connection.query(
      `
      SELECT id
      FROM sites
      WHERE domain = ?
        OR domain = ?
        OR domain = ?
        OR REPLACE(
          REPLACE(TRIM(TRAILING '/' FROM domain), 'https://', ''),
          'http://',
          ''
        ) = ?
      ORDER BY
        CASE WHEN domain = ? THEN 0 ELSE 1 END,
        site_name ASC
      LIMIT 1
      `,
      [
        siteDomain,
        withProtocol(siteDomain, "https"),
        withProtocol(siteDomain, "http"),
        normalizeDomain(siteDomain),
        siteDomain,
      ]
    );

    if (!siteRows.length) {
      throw new Error(
        `Site not found for keyword-pack prompt seeding: ${siteDomain}`
      );
    }

    const siteId = siteRows[0].id;
    const results: Array<{
      promptKey: string;
      inserted: number;
      updated: number;
      promptId: string;
    }> = [];

    for (const prompt of keywordPackPrompts) {
      await connection.query(
        `
        UPDATE prompt_versions
        SET active = FALSE
        WHERE site_id = ?
          AND prompt_key = ?
        `,
        [siteId, prompt.key]
      );

      const [existingRows]: any = await connection.query(
        `
        SELECT id
        FROM prompt_versions
        WHERE site_id = ?
          AND prompt_key = ?
          AND version = '1.0'
        LIMIT 1
        `,
        [siteId, prompt.key]
      );

      if (existingRows.length > 0) {
        await connection.query(
          `
          UPDATE prompt_versions
          SET
            name = ?,
            prompt_text = ?,
            model = 'gpt-4.1-mini',
            temperature = 0.35,
            output_format = 'json',
            active = TRUE
          WHERE id = ?
          `,
          [
            prompt.name,
            prompt.text,
            existingRows[0].id,
          ]
        );

        results.push({
          promptKey: prompt.key,
          inserted: 0,
          updated: 1,
          promptId: existingRows[0].id,
        });

        continue;
      }

      const promptId = randomUUID();

      await connection.query(
        `
        INSERT INTO prompt_versions (
          id,
          site_id,
          prompt_key,
          name,
          prompt_text,
          model,
          temperature,
          output_format,
          version,
          active,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, 'gpt-4.1-mini', 0.35, 'json', '1.0', TRUE, NOW())
        `,
        [
          promptId,
          siteId,
          prompt.key,
          prompt.name,
          prompt.text,
        ]
      );

      results.push({
        promptKey: prompt.key,
        inserted: 1,
        updated: 0,
        promptId,
      });
    }

    await connection.commit();

    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function normalizeDomain(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

function withProtocol(value: string, protocol: "http" | "https") {
  return `${protocol}://${normalizeDomain(value)}`;
}
