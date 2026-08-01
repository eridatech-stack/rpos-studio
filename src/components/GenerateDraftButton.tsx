"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/hooks/useToast";

const defaultModelsByProvider: Record<string, string> = {
  openai: "gpt-4.1-mini",
  anthropic: "claude-haiku-4-5-20251001",
};

const modelOptionsByProvider: Record<string, string[]> = {
  openai: ["gpt-4.1-mini", "gpt-4.1"],
  anthropic: [
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-5",
  ],
};

export function GenerateDraftButton({
  articleId,
  regenerate = false,
  published = false,
}: {
  articleId: string;
  regenerate?: boolean;
  published?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState(defaultModelsByProvider.openai);
  const [loading, setLoading] = useState(false);

  function changeProvider(nextProvider: string) {
    setProvider(nextProvider);
    setModel(defaultModelsByProvider[nextProvider]);
  }

  async function generateDraft() {
    if (published) {
      const confirmed = window.confirm(
        "Regenerate the local text for this published article? The live WordPress post will not change until you update it."
      );

      if (!confirmed) {
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch("/api/articles/generate-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          articleId,
          regenerate,
          aiProvider: provider,
          aiModel: model,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(
          "Draft generation failed",
          result.error || "Failed to generate the article draft.",
          12000
        );
        return;
      }

      toast.success(
        regenerate ? "Draft regenerated" : "Draft generated",
        regenerate
          ? `The local article draft was regenerated with ${formatProvider(provider)}. Review it before syncing to WordPress.`
          : `The article draft has been generated with ${formatProvider(provider)}.`
      );
      router.refresh();
    } catch (error: unknown) {
      toast.error(
        "Draft generation failed",
        error instanceof Error
          ? error.message
          : "Failed to generate the article draft.",
        12000
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={provider}
        onChange={(event) => changeProvider(event.target.value)}
        disabled={loading}
        suppressHydrationWarning
        className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
        title="AI API"
      >
        <option value="openai">OpenAI</option>
        <option value="anthropic">Claude</option>
      </select>

      <input
        value={model}
        onChange={(event) => setModel(event.target.value)}
        disabled={loading}
        list={`draft-model-options-${provider}`}
        suppressHydrationWarning
        className="h-11 max-w-[220px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
        title="AI model"
      />
      <datalist id={`draft-model-options-${provider}`}>
        {(modelOptionsByProvider[provider] || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </datalist>

      <Button
        type="button"
        onClick={generateDraft}
        disabled={loading}
        variant={regenerate ? "secondary" : "primary"}
      >
        {loading
          ? regenerate
            ? "Regenerating Draft..."
            : "Generating Draft..."
          : regenerate
            ? "Regenerate Draft"
            : "Generate Draft"}
      </Button>
    </div>
  );
}

function formatProvider(provider: string) {
  return provider === "anthropic" ? "Claude" : "OpenAI";
}
