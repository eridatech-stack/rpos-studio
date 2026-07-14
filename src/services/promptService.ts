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

  let text = prompt.prompt_text;

  for (const [key, value] of Object.entries(variables)) {
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
