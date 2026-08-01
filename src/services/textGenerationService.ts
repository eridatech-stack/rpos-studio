import { getOpenAIClient } from "@/lib/openai";
import {
  buildTextAiUsage,
  type AiProvider,
} from "@/services/aiUsage";

type TextGenerationUsage = {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
};

type TextGenerationResult = {
  content: string;
  aiUsage: ReturnType<typeof buildTextAiUsage>;
};

export async function generateText(input: {
  prompt: string;
  provider?: AiProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<TextGenerationResult> {
  const provider = normalizeProvider(input.provider, input.model);

  if (provider === "anthropic") {
    return generateTextWithAnthropic({
      prompt: input.prompt,
      model: input.model,
      maxTokens: input.maxTokens,
    });
  }

  return generateTextWithOpenAI({
    prompt: input.prompt,
    model: input.model,
    temperature: input.temperature,
  });
}

function normalizeProvider(
  provider: AiProvider | undefined,
  model: string
): AiProvider {
  if (provider) {
    return provider;
  }

  return model.trim().toLowerCase().startsWith("claude-")
    ? "anthropic"
    : "openai";
}

async function generateTextWithOpenAI(input: {
  prompt: string;
  model: string;
  temperature?: number;
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

  return {
    content: response.choices[0]?.message?.content?.trim() || "",
    aiUsage: buildTextAiUsage({
      provider: "openai",
      model: input.model,
      usage: response.usage,
    }),
  };
}

async function generateTextWithAnthropic(input: {
  prompt: string;
  model: string;
  maxTokens?: number;
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version":
        process.env.ANTHROPIC_VERSION || "2023-06-01",
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxTokens || getDefaultAnthropicMaxTokens(),
      messages: [
        {
          role: "user",
          content: input.prompt,
        },
      ],
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(formatAnthropicError(body, response.status));
  }

  const content = Array.isArray(body.content)
    ? body.content
        .filter((item: any) => item?.type === "text")
        .map((item: any) => item.text)
        .join("")
        .trim()
    : "";
  const usage = normalizeAnthropicUsage(body.usage);

  return {
    content,
    aiUsage: buildTextAiUsage({
      provider: "anthropic",
      model: input.model,
      usage,
    }),
  };
}

function getDefaultAnthropicMaxTokens() {
  const parsed = Number(process.env.ANTHROPIC_MAX_TOKENS);

  return Number.isFinite(parsed) && parsed > 0
    ? Math.round(parsed)
    : 8192;
}

function normalizeAnthropicUsage(
  usage: any
): TextGenerationUsage | null {
  if (!usage || typeof usage !== "object") {
    return null;
  }

  const promptTokens = normalizeNumber(usage.input_tokens);
  const completionTokens = normalizeNumber(usage.output_tokens);

  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens:
      promptTokens === null && completionTokens === null
        ? null
        : (promptTokens || 0) + (completionTokens || 0),
  };
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function formatAnthropicError(body: any, status: number) {
  const message =
    body?.error?.message ||
    body?.message ||
    "Claude text generation failed.";

  return `Claude API error ${status}: ${message}`;
}
