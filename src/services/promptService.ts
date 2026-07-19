import { getActivePrompt } from "@/repositories/promptRepository";

export async function renderPrompt(
  siteId: string,
  promptKey: string,
  variables: Record<string, string | number | null | undefined>
) {
  const prompt = await getActivePrompt(siteId, promptKey);

  if (!prompt) {
    throw new Error(`Active prompt not found: ${promptKey}`);
  }

  const temporalContext = getTemporalContext();
  const renderVariables = {
    ...temporalContext.variables,
    ...variables,
  };

  let text = prompt.prompt_text;

  if (shouldIncludeTemporalContext(promptKey)) {
    text = [
      temporalContext.instruction,
      getPromptSpecificInstruction(promptKey),
      "",
      text,
    ]
      .filter(Boolean)
      .join("\n");
  }

  for (const [key, value] of Object.entries(renderVariables)) {
    text = text.replaceAll(`{{${key}}}`, String(value ?? ""));
  }

  return {
    text,
    id: prompt.id,
    promptKey: prompt.prompt_key,
    name: prompt.name,
    version: prompt.version,
    model: prompt.model,
    temperature: Number(prompt.temperature),
    outputFormat: prompt.output_format,
  };
}

function getPromptSpecificInstruction(promptKey: string) {
  if (promptKey === "article_plan") {
    return [
      "SEO constraints:",
      "return meta_title between 35 and 65 characters;",
      "return meta_description between 120 and 160 characters;",
      "include the exact primary keyword '{{keyword}}' naturally in the article title, meta_title, and meta_description whenever possible;",
      "set target_word_count to about 1800 words;",
      "create an outline with one H1 article title and multiple H2 section headings;",
      "prefer clear, natural wording over stuffing keywords.",
      getReviewComparisonInstruction("plan"),
    ].join(" ");
  }

  if (promptKey === "article_draft") {
    return [
      "Draft structure constraints:",
      "write about 1800 words unless the outline explicitly requires a different length;",
      "start the Markdown draft with exactly one H1 using '# {{title}}';",
      "include the exact primary keyword '{{keyword}}' naturally in the opening 120 words;",
      "use multiple H2 sections with '##' headings for scan-friendly structure;",
      "do not use repeated H1 headings after the opening title;",
      "use these resolved internal link suggestions as contextual Markdown links when relevant: {{internal_links}};",
      "include 2-5 internal links when they fit naturally, using the provided URLs exactly;",
      "make the body comprehensive, practical, and naturally optimized for the primary keyword.",
      getReviewComparisonInstruction("draft"),
    ].join(" ");
  }

  if (promptKey.startsWith("keyword_pack_")) {
    return [
      "Keyword-pack freshness constraints:",
      "generate evergreen or current-year keyword ideas unless the user explicitly requested historical coverage;",
      "do not create keyword phrases, titles, categories, or clusters framed around past years;",
      "avoid stale year modifiers such as 2024 or 2025 for current recommendations, comparisons, lists, or buying guides;",
      "when a year is useful, use {{current_year}} as the current year.",
    ].join(" ");
  }

  return "";
}

function getReviewComparisonInstruction(stage: "plan" | "draft") {
  const prefix =
    "For comparison and review article types only, include";

  if (stage === "plan") {
    return [
      prefix,
      "outline sections for an 'Information verified on {{current_date}}' note, official product/source links, methodology, advantages and limitations, screenshot guidance where screenshots are permitted, sources, and a clear affiliate disclosure when affiliate opportunities may apply.",
      "For external_source_suggestions, prefer official product pages, official documentation, pricing pages, support pages, or reputable primary sources.",
    ].join(" ");
  }

  return [
    prefix,
    "an 'Information verified on {{current_date}}' note near the top, official product links where relevant, a methodology section, advantages and limitations, screenshot references only where permitted, a sources section, and a clear affiliate disclosure when affiliate links or recommendations may apply.",
    "Do not claim hands-on testing, screenshots, prices, or product facts unless the provided outline or sources support them; phrase uncertain details as items to verify during editorial review.",
  ].join(" ");
}

function shouldIncludeTemporalContext(promptKey: string) {
  return [
    "article_plan",
    "article_draft",
    "featured_image",
  ].includes(promptKey) || promptKey.startsWith("keyword_pack_");
}

function getTemporalContext() {
  const timeZone =
    process.env.CONTENT_TIME_ZONE ||
    process.env.TZ ||
    "Asia/Yerevan";
  const now = new Date();
  const currentDate = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const currentYear = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
  }).format(now);

  return {
    variables: {
      current_date: currentDate,
      current_year: currentYear,
      content_time_zone: timeZone,
      date_context: `Today is ${currentDate}. The current year is ${currentYear}.`,
    },
    instruction: [
      `Date context: today is ${currentDate} in ${timeZone}.`,
      `The current year is ${currentYear}.`,
      "Treat earlier years as historical unless the topic explicitly asks for historical coverage.",
      `Do not present 2024 or 2025 as the current year when writing current or evergreen content.`,
    ].join(" "),
  };
}
