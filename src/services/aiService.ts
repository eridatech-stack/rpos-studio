import { getOpenAIClient } from "@/lib/openai";
import { buildTextAiUsage } from "@/services/aiUsage";

export async function generateJsonWithAI(input: {
  prompt: string;
  model: string;
  temperature: number;
}) {
  const result = await generateJsonWithAIResult(input);

  return result.data;
}

export async function generateJsonWithAIResult(input: {
  prompt: string;
  model: string;
  temperature: number;
}) {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: input.model,
    messages: [
      {
        role: "user",
        content: input.prompt,
      },
    ],
    temperature: input.temperature,
  });

  const content =
    response.choices[0]?.message?.content?.trim() || "";

  const first = content.indexOf("{");
  const last = content.lastIndexOf("}");

  if (first === -1 || last === -1 || last < first) {
    throw new Error(
      "AI response did not contain a valid JSON object."
    );
  }

  const aiUsage = buildTextAiUsage({
    model: input.model,
    usage: response.usage,
  });

  try {
    return {
      data: JSON.parse(content.slice(first, last + 1)),
      aiUsage,
    };
  } catch {
    throw new Error(
      "AI response contained malformed JSON."
    );
  }
}
