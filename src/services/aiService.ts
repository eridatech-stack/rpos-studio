import { openai } from "@/lib/openai";

export async function generateJsonWithAI(input: {
  prompt: string;
  model: string;
  temperature: number;
}) {
  const response = await openai.chat.completions.create({
    model: input.model,
    messages: [{ role: "user", content: input.prompt }],
    temperature: input.temperature,
  });

  const content = response.choices[0]?.message?.content || "";

  const first = content.indexOf("{");
  const last = content.lastIndexOf("}");

  if (first === -1 || last === -1) {
    throw new Error("AI response did not contain valid JSON.");
  }

  return JSON.parse(content.slice(first, last + 1));
}