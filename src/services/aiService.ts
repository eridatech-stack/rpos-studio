import { type AiProvider } from "@/services/aiUsage";
import { generateText } from "@/services/textGenerationService";

export async function generateJsonWithAI(input: {
  prompt: string;
  provider?: AiProvider;
  model: string;
  temperature: number;
}) {
  const result = await generateJsonWithAIResult(input);

  return result.data;
}

export async function generateJsonWithAIResult(input: {
  prompt: string;
  provider?: AiProvider;
  model: string;
  temperature: number;
}) {
  const result = await generateText({
    provider: input.provider,
    model: input.model,
    prompt: input.prompt,
    temperature: input.temperature,
  });

  const content = result.content;

  const first = content.indexOf("{");
  const last = content.lastIndexOf("}");

  if (first === -1 || last === -1 || last < first) {
    throw new Error(
      "AI response did not contain a valid JSON object."
    );
  }

  try {
    return {
      data: JSON.parse(content.slice(first, last + 1)),
      aiUsage: result.aiUsage,
    };
  } catch {
    throw new Error(
      "AI response contained malformed JSON."
    );
  }
}
