type ExternalSourceSuggestion = {
  title: string;
  url: string;
};

export function getExternalSourceSuggestions(
  value: string | null | undefined
) {
  return uniqueByUrl(parseExternalSources(value));
}

export function buildExternalSourcePromptText(
  suggestions: ExternalSourceSuggestion[]
) {
  if (suggestions.length === 0) {
    return "No verified external source URLs are available yet.";
  }

  return suggestions
    .slice(0, 8)
    .map(
      (suggestion, index) =>
        `${index + 1}. Source: "${suggestion.title}" | URL: ${suggestion.url}`
    )
    .join("\n");
}

export function applyExternalLinksToMarkdown(
  markdown: string,
  suggestions: ExternalSourceSuggestion[]
) {
  if (!markdown.trim() || suggestions.length === 0) {
    return markdown;
  }

  let output = markdown;
  let inserted = 0;

  for (const suggestion of suggestions.slice(0, 8)) {
    if (markdownContainsUrl(output, suggestion.url)) {
      continue;
    }

    const next = linkFirstSourceMention(output, suggestion);

    if (next !== output) {
      output = next;
      inserted += 1;
    }
  }

  if (inserted > 0 || markdownContainsAnySuggestionUrl(output, suggestions)) {
    return output;
  }

  return appendSources(output, suggestions.slice(0, 5));
}

function parseExternalSources(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    const source = Array.isArray(parsed)
      ? parsed
      : parsed?.external_source_suggestions ||
        parsed?.external_sources ||
        parsed?.sources ||
        parsed?.links ||
        [];

    return Array.isArray(source)
      ? source
          .filter(
            (item): item is Record<string, unknown> =>
              Boolean(item) && typeof item === "object"
          )
          .map(normalizeExternalSource)
          .filter((item): item is ExternalSourceSuggestion => Boolean(item))
      : [];
  } catch {
    return [];
  }
}

function normalizeExternalSource(item: Record<string, unknown>) {
  const rawUrl = pickString(item, [
    "url",
    "href",
    "link",
    "source_url",
    "sourceUrl",
  ]);
  const url = normalizeHttpUrl(rawUrl);

  if (!url) {
    return null;
  }

  const title =
    pickString(item, [
      "title",
      "name",
      "source",
      "publisher",
      "organization",
      "label",
    ]) || readableDomain(url);

  return {
    title,
    url,
  };
}

function linkFirstSourceMention(
  markdown: string,
  suggestion: ExternalSourceSuggestion
) {
  const anchors = [
    suggestion.title,
    readableDomain(suggestion.url),
    hostnameWithoutWww(suggestion.url),
  ].filter(Boolean);
  const lines = markdown.split(/\r?\n/);

  for (const anchor of anchors) {
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];

      if (
        !line.trim() ||
        line.startsWith("#") ||
        line.startsWith(">") ||
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
  }

  return markdown;
}

function appendSources(
  markdown: string,
  suggestions: ExternalSourceSuggestion[]
) {
  const links = uniqueByUrl(suggestions)
    .map((suggestion) => `- [${suggestion.title}](${suggestion.url})`)
    .join("\n");

  if (!links) {
    return markdown;
  }

  return `${markdown.trimEnd()}\n\n## Sources and further reading\n\n${links}\n`;
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

function markdownContainsAnySuggestionUrl(
  markdown: string,
  suggestions: ExternalSourceSuggestion[]
) {
  return suggestions.some((suggestion) =>
    markdownContainsUrl(markdown, suggestion.url)
  );
}

function markdownContainsUrl(markdown: string, url: string) {
  return markdown.includes(`](${url})`) || markdown.includes(`href="${url}"`);
}

function uniqueByUrl(suggestions: ExternalSourceSuggestion[]) {
  const seen = new Set<string>();

  return suggestions.filter((suggestion) => {
    if (seen.has(suggestion.url)) {
      return false;
    }

    seen.add(suggestion.url);
    return true;
  });
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

function normalizeHttpUrl(value: string) {
  const trimmed = value.trim();

  if (!/^https?:\/\//i.test(trimmed)) {
    return "";
  }

  try {
    const url = new URL(trimmed);

    return url.toString();
  } catch {
    return "";
  }
}

function readableDomain(url: string) {
  const host = hostnameWithoutWww(url);

  return host || url;
}

function hostnameWithoutWww(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}
