export type AutomatedReviewSeverity = "pass" | "warning" | "fail";

export type AutomatedReviewFinding = {
  key: string;
  label: string;
  severity: AutomatedReviewSeverity;
  message: string;
  suggestion?: string;
};

export type AutomatedReviewState = {
  score: number;
  findings: AutomatedReviewFinding[];
  summary: string;
  updatedAt: string;
};

export function parseAutomatedReview(
  editorNotes: string | null | undefined
): AutomatedReviewState | null {
  if (!editorNotes) {
    return null;
  }

  try {
    const parsed = JSON.parse(editorNotes);
    const automatedReview = parsed?.automatedReview;

    if (
      automatedReview &&
      typeof automatedReview === "object" &&
      Array.isArray(automatedReview.findings)
    ) {
      return automatedReview;
    }
  } catch {
    return null;
  }

  return null;
}

export function buildAutomatedReview(
  article: any,
  input: {
    internalLinkCandidates?: InternalLinkCandidate[];
  } = {}
): AutomatedReviewState {
  const markdown = String(article.draft_markdown || "");
  const keyword = String(article.keywords?.keyword || "").trim();
  const metaTitle = String(article.meta_title || "");
  const metaDescription = String(article.meta_description || "");
  const title = String(article.title || "");
  const bodyText = stripMarkdown(markdown);
  const wordCount = countWords(bodyText);
  const sentenceCount = countSentences(bodyText);
  const averageWordsPerSentence =
    sentenceCount > 0 ? wordCount / sentenceCount : 0;
  const h2Count = (markdown.match(/^##\s+/gm) || []).length;
  const findings: AutomatedReviewFinding[] = [
    reviewMetaTitle(metaTitle || title, title, keyword),
    reviewMetaDescription(metaDescription, title, keyword),
    reviewKeywordPresence({
      keyword,
      title,
      metaTitle,
      metaDescription,
      bodyText,
    }),
    reviewWordCount(wordCount),
    reviewHeadings(h2Count),
    reviewReadability(averageWordsPerSentence),
    reviewInternalLinks(
      article.internal_links,
      input.internalLinkCandidates || []
    ),
    reviewExternalSources(article.external_sources),
    reviewFeaturedImage(article.images),
  ];

  const passing = findings.filter(
    (finding) => finding.severity === "pass"
  ).length;
  const score = Math.round((passing / findings.length) * 100);

  return {
    score,
    findings,
    summary: buildSummary(score, findings),
    updatedAt: new Date().toISOString(),
  };
}

export function mergeEditorNotes(
  editorNotes: string | null | undefined,
  patch: {
    automatedReview?: AutomatedReviewState;
    qualityReview?: unknown;
  }
) {
  const parsed = parseEditorNotesPayload(editorNotes);

  return JSON.stringify(
    {
      ...parsed,
      ...patch,
    },
    null,
    2
  );
}

function parseEditorNotesPayload(editorNotes: string | null | undefined) {
  if (!editorNotes) {
    return {};
  }

  try {
    const parsed = JSON.parse(editorNotes);
    return parsed && typeof parsed === "object"
      ? parsed
      : { notes: editorNotes };
  } catch {
    return {
      qualityReview: {
        notes: editorNotes,
        updatedAt: null,
      },
    };
  }
}

type InternalLinkCandidate = {
  title: string;
  slug: string;
  url: string | null;
};

function reviewMetaTitle(
  value: string,
  title: string,
  keyword: string
): AutomatedReviewFinding {
  const length = value.trim().length;

  if (length >= 35 && length <= 65) {
    return pass("metaTitle", "Meta title", `${length} characters.`);
  }

  const suggestion = buildMetaTitleSuggestion(title, keyword);

  return warning(
    "metaTitle",
    "Meta title",
    `Meta title is ${length} characters; aim for 35-65.`,
    suggestion
  );
}

function reviewMetaDescription(
  value: string,
  title: string,
  keyword: string
): AutomatedReviewFinding {
  const length = value.trim().length;

  if (length >= 120 && length <= 160) {
    return pass("metaDescription", "Meta description", `${length} characters.`);
  }

  const suggestion = buildMetaDescriptionSuggestion(title, keyword);

  return warning(
    "metaDescription",
    "Meta description",
    `Meta description is ${length} characters; aim for 120-160.`,
    suggestion
  );
}

function reviewKeywordPresence(input: {
  keyword: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  bodyText: string;
}): AutomatedReviewFinding {
  if (!input.keyword) {
    return warning(
      "keyword",
      "Keyword coverage",
      "No primary keyword is attached."
    );
  }

  const needle = input.keyword.toLowerCase();
  const haystack = [
    input.title,
    input.metaTitle,
    input.metaDescription,
    input.bodyText.slice(0, 1200),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle)
    ? pass("keyword", "Keyword coverage", "Primary keyword appears in key areas.")
    : warning(
        "keyword",
        "Keyword coverage",
        "Primary keyword is missing from title/meta/intro signals."
      );
}

function reviewWordCount(wordCount: number): AutomatedReviewFinding {
  if (wordCount >= 900) {
    return pass("wordCount", "Word count", `${wordCount} words.`);
  }

  return warning(
    "wordCount",
    "Word count",
    `${wordCount} words; consider expanding for depth.`
  );
}

function reviewHeadings(h2Count: number): AutomatedReviewFinding {
  if (h2Count >= 3) {
    return pass("headings", "Structure", `${h2Count} H2 sections.`);
  }

  return warning(
    "headings",
    "Structure",
    `${h2Count} H2 sections; add clearer scan structure.`
  );
}

function reviewReadability(
  averageWordsPerSentence: number
): AutomatedReviewFinding {
  if (
    averageWordsPerSentence > 0 &&
    averageWordsPerSentence <= 24
  ) {
    return pass(
      "readability",
      "Readability",
      `${averageWordsPerSentence.toFixed(1)} words per sentence.`
    );
  }

  return warning(
    "readability",
    "Readability",
    averageWordsPerSentence
      ? `${averageWordsPerSentence.toFixed(1)} words per sentence; tighten long sentences.`
      : "No sentence structure detected."
  );
}

function reviewInternalLinks(
  value: string | null,
  candidates: InternalLinkCandidate[]
): AutomatedReviewFinding {
  const links = parseJsonArray(value);

  if (links.length > 0) {
    return pass("internalLinks", "Internal links", `${links.length} suggestions.`);
  }

  const suggestion =
    candidates.length > 0
      ? candidates
          .slice(0, 3)
          .map((candidate) => {
            const href = candidate.url || `/${candidate.slug}`;
            return `${candidate.title} (${href})`;
          })
          .join("; ")
      : "Add 2-3 links to related published articles once available.";

  return warning(
    "internalLinks",
    "Internal links",
    "No internal link suggestions found.",
    suggestion
  );
}

function reviewExternalSources(value: string | null): AutomatedReviewFinding {
  const sources = parseJsonArray(value);

  return sources.length > 0
    ? pass("externalSources", "External sources", `${sources.length} suggestions.`)
    : warning(
        "externalSources",
        "External sources",
        "No external source suggestions found."
      );
}

function reviewFeaturedImage(images: any[]): AutomatedReviewFinding {
  const image = (images || []).find(
    (item: any) =>
      item.type === "featured" &&
      ["uploaded", "approved"].includes(item.status)
  );

  if (image?.alt_text && image?.wordpress_media_id) {
    return pass(
      "featuredImage",
      "Featured image",
      "Uploaded with alt text."
    );
  }

  return warning(
    "featuredImage",
    "Featured image",
    "Featured image is missing, not uploaded, or lacks alt text.",
    "Generate or upload a featured image, then confirm the alt text describes the article topic."
  );
}

function buildSummary(
  score: number,
  findings: AutomatedReviewFinding[]
) {
  const warnings = findings.filter(
    (finding) => finding.severity !== "pass"
  ).length;

  return warnings === 0
    ? `Automated review passed with a ${score}% score.`
    : `Automated review found ${warnings} item(s) to review.`;
}

function pass(
  key: string,
  label: string,
  message: string
): AutomatedReviewFinding {
  return {
    key,
    label,
    severity: "pass",
    message,
  };
}

function warning(
  key: string,
  label: string,
  message: string,
  suggestion?: string
): AutomatedReviewFinding {
  return {
    key,
    label,
    severity: "warning",
    message,
    suggestion,
  };
}

function buildMetaTitleSuggestion(title: string, keyword: string) {
  const source = title || keyword;
  const compact = source.replace(/\s+/g, " ").trim();

  if (compact.length >= 35 && compact.length <= 65) {
    return compact;
  }

  const suffix = keyword ? `: ${keyword}` : "";
  const expanded = `${compact}${suffix}`.trim();

  if (expanded.length >= 35 && expanded.length <= 65) {
    return expanded;
  }

  return trimToLength(expanded || compact, 65);
}

function buildMetaDescriptionSuggestion(title: string, keyword: string) {
  const topic = keyword || title;
  const suggestion = `Compare practical options for ${topic}, including key features, limits, and how to choose the right fit for your workflow.`;

  return trimToLength(suggestion, 160);
}

function trimToLength(value: string, limit: number) {
  const words = value.split(/\s+/);
  let output = "";

  for (const word of words) {
    const next = output ? `${output} ${word}` : word;

    if (next.length > limit) {
      break;
    }

    output = next;
  }

  return output || value.slice(0, limit).trim();
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(value: string) {
  return (value.match(/\b[\p{L}\p{N}'-]+\b/gu) || []).length;
}

function countSentences(value: string) {
  return (value.match(/[.!?]+(?:\s|$)/g) || []).length;
}

function parseJsonArray(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
