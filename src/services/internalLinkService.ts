import { articles_status, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ArticleLike = {
  id: string;
  site_id: string;
  category_id?: string | null;
  cluster_id?: string | null;
  title?: string | null;
  slug?: string | null;
  internal_links?: string | null;
  sites?: {
    domain?: string | null;
  } | null;
};

type InternalLinkSuggestion = {
  anchorText: string;
  targetTitle: string;
  url: string;
};

type InternalLinkCandidate = {
  title: string;
  slug: string;
  url: string;
};

export async function getResolvedInternalLinkSuggestions(
  article: ArticleLike
) {
  const candidates = await getInternalLinkCandidates(article);
  const planned = parseInternalLinkSuggestions(article.internal_links);
  const resolved = resolvePlannedSuggestions({
    planned,
    candidates,
    article,
  });

  return resolved.length > 0
    ? resolved
    : candidates.slice(0, 3).map((candidate) => ({
        anchorText: candidate.title,
        targetTitle: candidate.title,
        url: candidate.url,
      }));
}

export function buildInternalLinkPromptText(
  suggestions: InternalLinkSuggestion[]
) {
  if (suggestions.length === 0) {
    return "No resolved internal links are available yet.";
  }

  return suggestions
    .slice(0, 5)
    .map(
      (suggestion, index) =>
        `${index + 1}. Anchor: "${suggestion.anchorText}" | Target: "${suggestion.targetTitle}" | URL: ${suggestion.url}`
    )
    .join("\n");
}

export function applyInternalLinksToMarkdown(
  markdown: string,
  suggestions: InternalLinkSuggestion[]
) {
  if (!markdown.trim() || suggestions.length === 0) {
    return markdown;
  }

  let output = markdown;
  let inserted = 0;

  for (const suggestion of suggestions.slice(0, 5)) {
    if (markdownContainsUrl(output, suggestion.url)) {
      continue;
    }

    const next = linkFirstParagraphMention(output, suggestion);

    if (next !== output) {
      output = next;
      inserted += 1;
    }
  }

  if (inserted > 0 || markdownContainsAnySuggestionUrl(output, suggestions)) {
    return output;
  }

  return appendRelatedReading(output, suggestions.slice(0, 3));
}

async function getInternalLinkCandidates(article: ArticleLike) {
  const relatedFilters: Prisma.articlesWhereInput[] = [];

  if (article.cluster_id) {
    relatedFilters.push({ cluster_id: article.cluster_id });
  }

  if (article.category_id) {
    relatedFilters.push({ category_id: article.category_id });
  }
  const linkableStatuses: articles_status[] = [
    "published",
    "approved",
    "wordpress_draft",
    "human_review",
    "draft_ready",
  ];

  const where = {
    site_id: article.site_id,
    id: {
      not: article.id,
    },
    status: {
      in: linkableStatuses,
    },
    ...(relatedFilters.length > 0
      ? {
          OR: relatedFilters,
        }
      : {}),
  };

  const articles = await prisma.articles.findMany({
    where,
    orderBy: {
      updated_at: "desc",
    },
    take: 20,
    select: {
      title: true,
      slug: true,
      published_url: true,
      wordpress_draft_url: true,
    },
  });

  return articles
    .map((candidate) => ({
      title: candidate.title,
      slug: candidate.slug,
      url:
        candidate.published_url ||
        buildArticleUrl(article.sites?.domain, candidate.slug) ||
        candidate.wordpress_draft_url ||
        `/${candidate.slug}`,
    }))
    .filter((candidate) => candidate.title && candidate.url);
}

function resolvePlannedSuggestions(input: {
  planned: Array<Record<string, unknown>>;
  candidates: InternalLinkCandidate[];
  article: ArticleLike;
}) {
  const resolved: InternalLinkSuggestion[] = [];

  for (const item of input.planned) {
    const anchorText = pickString(item, [
      "anchor_text",
      "anchorText",
      "anchor",
      "keyword",
      "target_keyword",
      "targetKeyword",
      "text",
    ]);
    const targetTitle = pickString(item, [
      "target_article",
      "targetArticle",
      "target_title",
      "targetTitle",
      "title",
      "article",
    ]);
    const rawUrl = pickString(item, [
      "url",
      "href",
      "link",
      "target_url",
      "targetUrl",
    ]);
    const rawSlug = pickString(item, ["slug", "target_slug", "targetSlug"]);
    const matchedCandidate = findMatchingCandidate(
      input.candidates,
      targetTitle || anchorText || rawSlug
    );
    const url =
      normalizeUrl(rawUrl) ||
      matchedCandidate?.url ||
      buildArticleUrl(input.article.sites?.domain, rawSlug);

    if (!url) {
      continue;
    }

    const label =
      anchorText ||
      matchedCandidate?.title ||
      targetTitle ||
      rawSlug;

    if (!label) {
      continue;
    }

    resolved.push({
      anchorText: label,
      targetTitle: targetTitle || matchedCandidate?.title || label,
      url,
    });
  }

  return uniqueByUrl(resolved);
}

function parseInternalLinkSuggestions(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    const source = Array.isArray(parsed)
      ? parsed
      : parsed?.internal_link_suggestions ||
        parsed?.internal_links ||
        parsed?.links ||
        parsed?.suggestions ||
        [];

    return Array.isArray(source)
      ? source.filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === "object"
        )
      : [];
  } catch {
    return [];
  }
}

function linkFirstParagraphMention(
  markdown: string,
  suggestion: InternalLinkSuggestion
) {
  const lines = markdown.split(/\r?\n/);
  const anchor = suggestion.anchorText.trim();

  if (!anchor) {
    return markdown;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (
      !line.trim() ||
      line.startsWith("#") ||
      line.startsWith(">") ||
      line.startsWith("- ") ||
      line.startsWith("* ") ||
      line.includes("](")
    ) {
      continue;
    }

    const linkedLine = replaceFirstPlainTextMatch(
      line,
      anchor,
      `[${anchor}](${suggestion.url})`
    );

    if (linkedLine !== line) {
      lines[index] = linkedLine;
      return lines.join("\n");
    }
  }

  return markdown;
}

function replaceFirstPlainTextMatch(
  line: string,
  needle: string,
  replacement: string
) {
  const escapedNeedle = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`\\b${escapedNeedle}\\b`, "i");

  return line.replace(matcher, replacement);
}

function appendRelatedReading(
  markdown: string,
  suggestions: InternalLinkSuggestion[]
) {
  const links = uniqueByUrl(suggestions)
    .map((suggestion) => `- [${suggestion.targetTitle}](${suggestion.url})`)
    .join("\n");

  if (!links) {
    return markdown;
  }

  return `${markdown.trimEnd()}\n\n## Related reading\n\n${links}\n`;
}

function markdownContainsAnySuggestionUrl(
  markdown: string,
  suggestions: InternalLinkSuggestion[]
) {
  return suggestions.some((suggestion) =>
    markdownContainsUrl(markdown, suggestion.url)
  );
}

function markdownContainsUrl(markdown: string, url: string) {
  return markdown.includes(`](${url})`) || markdown.includes(`href="${url}"`);
}

function pickString(
  item: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    const value = item[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function findMatchingCandidate(
  candidates: InternalLinkCandidate[],
  value: string
) {
  const normalized = normalizeForMatch(value);

  if (!normalized) {
    return null;
  }

  return (
    candidates.find(
      (candidate) =>
        normalizeForMatch(candidate.title) === normalized ||
        normalizeForMatch(candidate.slug) === normalized
    ) ||
    candidates.find(
      (candidate) =>
        normalizeForMatch(candidate.title).includes(normalized) ||
        normalized.includes(normalizeForMatch(candidate.title))
    ) ||
    null
  );
}

function uniqueByUrl(suggestions: InternalLinkSuggestion[]) {
  const seen = new Set<string>();

  return suggestions.filter((suggestion) => {
    if (seen.has(suggestion.url)) {
      return false;
    }

    seen.add(suggestion.url);
    return true;
  });
}

function buildArticleUrl(domain: string | null | undefined, slug: string) {
  if (!slug) {
    return "";
  }

  const normalizedSlug = slug.startsWith("/") ? slug.slice(1) : slug;
  const normalizedDomain = normalizeUrl(domain || "");

  if (!normalizedDomain) {
    return `/${normalizedSlug}`;
  }

  return `${normalizedDomain.replace(/\/$/, "")}/${normalizedSlug}`;
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return "";
}

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
