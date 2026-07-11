"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateDraftButton({ articleId }: { articleId: string }) {
  const [loading, setLoading] = useState(false);

  async function generateDraft() {
    setLoading(true);

    const router = useRouter();

    const response = await fetch("/api/articles/generate-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ articleId }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.error || "Failed to generate draft.");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <button
      onClick={generateDraft}
      disabled={loading}
      className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
    >
      {loading ? "Generating Draft..." : "Generate Draft"}
    </button>
  );
}