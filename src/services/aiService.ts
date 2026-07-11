import { getOpenAIClient } from "@/lib/openai";

export async function generateJsonWithAI(input: {
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

  try {
    return JSON.parse(content.slice(first, last + 1));
  } catch {
    throw new Error(
      "AI response contained malformed JSON."
    );
  }
}