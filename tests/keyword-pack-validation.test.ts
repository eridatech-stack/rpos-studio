import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCategoryDraft,
  normalizeClusterDraft,
  normalizeItemDraft,
  validateKeywordPackItems,
} from "../src/modules/keyword-packs/validation";
import { parseKeywordPackInput } from "../src/modules/keyword-packs/apiValidation";

const categoryId = "category-1";
const clusterId = "cluster-1";

test("normalizes enum values and keyword casing", () => {
  const item = normalizeItemDraft(
    {
      keyword: "  Best FREE Task Apps  ",
      intent: "unsupported",
      article_type: "how to",
      priority: "urgent",
      estimated_search_volume: "1,200",
      estimated_difficulty: "105",
      ai_opportunity_score: "-10",
    },
    { categoryId, clusterId }
  );

  assert.equal(item.keyword, "best free task apps");
  assert.equal(item.intent, "informational");
  assert.equal(item.articleType, "how_to");
  assert.equal(item.priority, "medium");
  assert.equal(item.estimatedSearchVolume, 1200);
  assert.equal(item.estimatedDifficulty, 100);
  assert.equal(item.aiOpportunityScore, 0);
});

test("removes exact duplicates and flags near duplicates", () => {
  const items = [
    item("Best task management apps", true),
    item("best task management apps"),
    item("Top task management tools"),
  ];

  const result = validateKeywordPackItems({
    requestedCount: 10,
    items,
    liveKeywords: [],
    excludedTopics: null,
  });

  assert.equal(result.items.length, 2);
  assert.ok(result.issues.some((issue) => issue.type === "duplicate"));
  assert.ok(result.issues.some((issue) => issue.type === "near_duplicate"));
  assert.ok(result.issues.some((issue) => issue.type === "shortfall"));
});

test("marks live keyword duplicates without dropping them", () => {
  const result = validateKeywordPackItems({
    requestedCount: 2,
    items: [item("Project planning software", true)],
    liveKeywords: [{ id: "existing-keyword-1", keyword: "project planning software" }],
    excludedTopics: null,
  });

  assert.equal(result.items[0]?.reviewStatus, "duplicate");
  assert.equal(result.items[0]?.existingKeywordId, "existing-keyword-1");
  assert.ok(result.items[0]?.notes?.includes("Duplicate of an existing site keyword."));
});

test("flags excluded topics and assigns supporting items to cluster pillar", () => {
  const result = validateKeywordPackItems({
    requestedCount: 2,
    items: [
      item("Task management apps", true, "pillar-item"),
      item("Task management apps for gambling teams", false, "support-item"),
    ],
    liveKeywords: [],
    excludedTopics: "gambling",
  });

  const supporting = result.items.find((candidate) => candidate.id === "support-item");

  assert.equal(supporting?.parentPillarItemId, "pillar-item");
  assert.ok(result.issues.some((issue) => issue.type === "excluded_topic"));
});

test("enforces supported keyword pack sizes", () => {
  assert.throws(
    () =>
      parseKeywordPackInput({
        siteId: "site-1",
        name: "Invalid pack",
        niche: "task management",
        requestedKeywordCount: 25,
      }),
    /requestedKeywordCount/
  );
});

test("replaces stale years in keyword pack drafts", () => {
  const currentYear = new Intl.DateTimeFormat("en", {
    timeZone: process.env.CONTENT_TIME_ZONE || process.env.TZ || "Asia/Yerevan",
    year: "numeric",
  }).format(new Date());
  const category = normalizeCategoryDraft(
    {
      name: "Best Travel Apps 2024",
      slug: "best-travel-apps-2024",
      description: "Current travel planning in 2024",
    },
    0
  );
  const cluster = normalizeClusterDraft(
    {
      name: "Travel Planning Tools 2024",
      slug: "travel-planning-tools-2024",
      pillar_keyword: "best travel planner 2024",
      pillar_title: "Best Travel Planner in 2024",
    },
    categoryId,
    0
  );
  const keywordItem = normalizeItemDraft(
    {
      keyword: "best free task management apps 2024",
      suggested_title: "Best Free Task Management Apps in 2024",
      notes: "Compare popular tools for 2024.",
    },
    { categoryId, clusterId }
  );

  assert.equal(category.name, `Best Travel Apps ${currentYear}`);
  assert.equal(category.slug, `best-travel-apps-${currentYear}`);
  assert.equal(cluster.pillarKeyword, `best travel planner ${currentYear}`);
  assert.equal(cluster.pillarTitle, `Best Travel Planner in ${currentYear}`);
  assert.equal(
    keywordItem.keyword,
    `best free task management apps ${currentYear}`
  );
  assert.equal(
    keywordItem.suggestedTitle,
    `Best Free Task Management Apps in ${currentYear}`
  );
  assert.equal(keywordItem.notes, `Compare popular tools for ${currentYear}.`);
});

function item(keyword: string, isPillar = false, id?: string) {
  return {
    id,
    categoryId,
    clusterId,
    keyword,
    suggestedTitle: null,
    intent: "informational" as const,
    articleType: isPillar ? ("pillar" as const) : ("cluster" as const),
    priority: "medium" as const,
    estimatedSearchVolume: null,
    estimatedDifficulty: null,
    aiOpportunityScore: null,
    isPillar,
    notes: null,
    reviewStatus: "pending" as const,
  };
}
