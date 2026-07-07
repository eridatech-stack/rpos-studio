"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function PromptEditor({ prompt }: { prompt: any }) {
  const [promptText, setPromptText] = useState(prompt.prompt_text);
  const [model, setModel] = useState(prompt.model || "gpt-4.1-mini");
  const [temperature, setTemperature] = useState(String(prompt.temperature ?? "0.40"));
  const [outputFormat, setOutputFormat] = useState(prompt.output_format || "json");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function savePrompt() {
    setSaving(true);
    setSaved(false);

    const response = await fetch("/api/prompts/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: prompt.id,
        promptText,
        model,
        temperature,
        outputFormat,
      }),
    });

    const result = await response.json();
    setSaving(false);

    if (!response.ok) {
      alert(result.error || "Failed to save prompt.");
      return;
    }

    setSaved(true);
  }

  return (
    <div className="space-y-5">
      {saved && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Prompt saved successfully.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="text-sm font-semibold text-slate-500">Model</label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="mt-1 w-full rounded-lg border p-3"
          />
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