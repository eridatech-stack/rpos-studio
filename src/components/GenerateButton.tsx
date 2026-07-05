"use client";

import { useState } from "react";

export function GenerateButton({ keywordId }: { keywordId: string }) {
  const [loading, setLoading] = useState(false);

  async function generateArticle() {
    setLoading(true);

    const response = await fetch("/api/keywords/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keywordId }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.error || "Failed to generate article plan.");
      setLoading(false);
      return;
    }

    window.location.href = `/articles/${result.articleId}`;
  }

  return (
    <button
      onClick={generateArticle}
      disabled={loading}
      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
    >
      {loading ? "Generating..." : "Generate"}
    </button>
  );
}
