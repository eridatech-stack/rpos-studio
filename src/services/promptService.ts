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

  for (const [key, value] of Object.entries(renderVariables)) {
    text = text.replaceAll(`{{${key}}}`, String(value ?? ""));
  }

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
      "set target_word_count to about 1800 words;",
      "create an outline with one H1 article title and multiple H2 section headings;",
      "prefer clear, natural wording over stuffing keywords.",
    ].join(" ");
  }

  if (promptKey === "article_draft") {
    return [
      "Draft structure constraints:",
      "write about 1800 words unless the outline explicitly requires a different length;",
      "start the Markdown draft with exactly one H1 using '# {{title}}';",
      "use multiple H2 sections with '##' headings for scan-friendly structure;",
      "do not use repeated H1 headings after the opening title;",
      "make the body comprehensive, practical, and naturally optimized for the primary keyword.",
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
