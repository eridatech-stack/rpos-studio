"use client";

import { useState } from "react";
import { MarkdownPreview } from "@/components/MarkdownPreview";

export function DraftEditor({
  articleId,
  initialMarkdown,
}: {
  articleId: string;
  initialMarkdown: string;
}) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<"preview" | "edit">("preview");

  async function saveDraft() {
    setSaving(true);
    setSaved(false);

    const response = await fetch("/api/articles/save-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        articleId,
        markdown,
      }),
    });

    const result = await response.json();

    setSaving(false);

    if (!response.ok) {
      alert(result.error || "Failed to save draft.");
      return;
    }

    setSaved(true);
  }

  return (
    <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">Draft</h2>

        <div className="flex gap-2">
          <button
            onClick={() => setMode("preview")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              mode === "preview"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Preview
          </button>

          <button
            onClick={() => setMode("edit")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              mode === "edit"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Edit
          </button>

          <button
            onClick={saveDraft}
            disabled={saving}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {saved && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Draft saved successfully.
        </div>
      )}

      {mode === "edit" ? (
        <textarea
          value={markdown}
          onChange={(event) => setMarkdown(event.target.value)}
          className="mt-4 h-[700px] w-full rounded-lg border p-4 font-mono text-sm"
        />
      ) : (
        <div className="mt-4 rounded-lg bg-slate-50 p-6">
          <MarkdownPreview content={markdown} />
        </div>
      )}
    </section>
  );
}