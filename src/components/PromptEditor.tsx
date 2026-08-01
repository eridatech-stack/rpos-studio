"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/hooks/useToast";

const defaultModelsByProvider: Record<string, string> = {
  openai: "gpt-4.1-mini",
  anthropic: "claude-haiku-4-5-20251001",
};

export function PromptEditor({ prompt }: { prompt: any }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(prompt.name || "");
  const [promptText, setPromptText] = useState(prompt.prompt_text);
  const [provider, setProvider] = useState(prompt.provider || "openai");
  const [model, setModel] = useState(prompt.model || "gpt-4.1-mini");
  const [temperature, setTemperature] = useState(String(prompt.temperature ?? "0.40"));
  const [outputFormat, setOutputFormat] = useState(prompt.output_format || "json");
  const [saving, setSaving] = useState(false);

  function changeProvider(nextProvider: string) {
    setProvider(nextProvider);

    if (!model || model === defaultModelsByProvider[provider]) {
      setModel(defaultModelsByProvider[nextProvider]);
    }
  }

  async function savePrompt() {
    setSaving(true);

    const response = await fetch("/api/prompts/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: prompt.id,
        name,
        promptText,
        provider,
        model,
        temperature,
        outputFormat,
      }),
    });

    const result = await response.json();
    setSaving(false);

    if (!response.ok) {
      toast.error(
        "Prompt save failed",
        result.error || "Failed to save prompt.",
        15000
      );
      return;
    }

    toast.success("Prompt saved", "The new prompt version is active.");
    router.push("/ai/prompts");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-semibold text-slate-500">
          Generator Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border p-3"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label className="text-sm font-semibold text-slate-500">
            API Provider
          </label>
          <select
            value={provider}
            onChange={(e) => changeProvider(e.target.value)}
            className="mt-1 w-full rounded-lg border p-3"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Claude</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-500">Model</label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            list="prompt-model-options"
            className="mt-1 w-full rounded-lg border p-3"
          />
          <datalist id="prompt-model-options">
            <option value="gpt-4.1-mini" />
            <option value="gpt-4.1" />
            <option value="claude-haiku-4-5-20251001" />
            <option value="claude-sonnet-4-5" />
          </datalist>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-500">
            Temperature
          </label>
          <input
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="mt-1 w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-500">
            Output Format
          </label>
          <select
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value)}
            className="mt-1 w-full rounded-lg border p-3"
          >
            <option value="json">json</option>
            <option value="markdown">markdown</option>
            <option value="html">html</option>
            <option value="plain_text">plain_text</option>
          </select>
        </div>
      </div>

      <textarea
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
        className="h-[600px] w-full rounded-xl border bg-slate-950 p-5 font-mono text-sm text-slate-100"
      />

      <Button onClick={savePrompt} disabled={saving}>
        {saving ? "Saving..." : "Save Prompt"}
      </Button>
    </div>
  );
}
