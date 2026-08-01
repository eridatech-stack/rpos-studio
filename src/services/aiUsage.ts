type TokenUsage = {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
};

export type AiProvider = "openai" | "anthropic";

type TextModelRate = {
  inputPerMillion: number;
  outputPerMillion: number;
};

type AiUsageMetadata = {
  provider: AiProvider;
  kind: "text" | "image";
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
};

const defaultTextModelRates: Record<string, TextModelRate> = {
  "gpt-4.1-mini": {
    inputPerMillion: 0.4,
    outputPerMillion: 1.6,
  },
  "claude-haiku-4-5-20251001": {
    inputPerMillion: 1,
    outputPerMillion: 5,
  },
  "claude-sonnet-4-5": {
    inputPerMillion: 3,
    outputPerMillion: 15,
  },
};

export function buildTextAiUsage(input: {
  provider?: AiProvider;
  model: string;
  usage?: TokenUsage | null;
}): AiUsageMetadata {
  const promptTokens = normalizeTokenCount(
    input.usage?.prompt_tokens
  );
  const completionTokens = normalizeTokenCount(
    input.usage?.completion_tokens
  );
  const totalTokens = normalizeTokenCount(
    input.usage?.total_tokens
  );

  return {
    provider: input.provider || "openai",
    kind: "text",
    model: input.model,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd: estimateTextCostUsd({
      model: input.model,
      promptTokens,
      completionTokens,
    }),
  };
}

export function buildImageAiUsage(input: {
  model: string;
  size: string;
  quality: string;
  outputFormat: string;
  outputCompression?: number | null;
}) {
  return {
    provider: "openai" as const,
    kind: "image" as const,
    model: input.model,
    size: input.size,
    quality: input.quality,
    outputFormat: input.outputFormat,
    outputCompression: input.outputCompression ?? null,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    estimatedCostUsd: null,
  };
}

function estimateTextCostUsd(input: {
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
}) {
  const rate = getTextModelRates()[input.model];

  if (!rate) {
    return null;
  }

  const promptTokens = input.promptTokens ?? 0;
  const completionTokens = input.completionTokens ?? 0;
  const cost =
    (promptTokens / 1_000_000) * rate.inputPerMillion +
    (completionTokens / 1_000_000) * rate.outputPerMillion;

  return Number(cost.toFixed(6));
}

function getTextModelRates() {
  const override = process.env.AI_USAGE_PRICING_JSON;

  if (!override) {
    return defaultTextModelRates;
  }

  try {
    return {
      ...defaultTextModelRates,
      ...JSON.parse(override),
    } as Record<string, TextModelRate>;
  } catch {
    return defaultTextModelRates;
  }
}

function normalizeTokenCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}
