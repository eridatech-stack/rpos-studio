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
    text = `${temporalContext.instruction}\n\n${text}`;
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

function shouldIncludeTemporalContext(promptKey: string) {
  return [
    "article_plan",
    "article_draft",
    "featured_image",
  ].includes(promptKey);
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
