type TokenUsage = {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
};

type TextModelRate = {
  inputPerMillion: number;
  outputPerMillion: number;
};

type AiUsageMetadata = {
  provider: "openai";
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
};

export function buildTextAiUsage(input: {
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
    provider: "openai",
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
