"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function StartProductionButton({
  articleId,
}: {
  articleId: string;
}) {
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);

    const response = await fetch("/api/production/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        articleId,
      }),
    });

    const result = await response.json();

    setLoading(false);

    if (!response.ok) {
      alert(result.error);
      return;
    }

    alert("Production started.");
  }

  return (
    <Button
      onClick={start}
      disabled={loading}
    >
      {loading
        ? "Starting..."
        : "🚀 Start Production"}
    </Button>
  );
}