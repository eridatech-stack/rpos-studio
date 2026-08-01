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

export function RetryProductionRunButton({
  productionRunId,
}: {
  productionRunId: string;
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

  async function retryRun() {
    const confirmed = window.confirm(
      `Retry this failed production run using ${formatProvider(provider)}?`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/production/runs/retry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productionRunId,
          aiProvider: provider,
          aiModel: model,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(
          "Retry failed",
          result.error || "Unable to retry this production run.",
          12000
        );
        return;
      }

      toast.success(
        "Production run queued",
        `The failed run was returned to the worker queue using ${formatProvider(provider)}.`
      );
      router.refresh();
    } catch (error: unknown) {
      toast.error(
        "Retry failed",
        error instanceof Error
          ? error.message
          : "Unable to retry this production run.",
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
        list={`retry-run-model-options-${provider}`}
        suppressHydrationWarning
        className="h-11 max-w-[220px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
        title="AI model"
      />
      <datalist id={`retry-run-model-options-${provider}`}>
        {(modelOptionsByProvider[provider] || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </datalist>

      <Button
        type="button"
        onClick={retryRun}
        disabled={loading}
        variant="secondary"
      >
        {loading ? "Retrying..." : "Retry Run"}
      </Button>
    </div>
  );
}

function formatProvider(provider: string) {
  return provider === "anthropic" ? "Claude" : "OpenAI";
}
