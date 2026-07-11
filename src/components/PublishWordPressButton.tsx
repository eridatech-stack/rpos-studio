"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PublishWordPressButton({ articleId }: { articleId: string }) {
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function publishDraft() {
    setLoading(true);

    const response = await fetch("/api/articles/publish-wordpress-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ articleId }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.error || "Failed to create WordPress draft.");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <button
      onClick={publishDraft}
      disabled={loading}
      className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
    >
      {loading ? "Creating WordPress Draft..." : "Publish to WordPress Draft"}
    </button>
  );
}