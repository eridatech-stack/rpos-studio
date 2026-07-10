"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useToast } from "@/hooks/useToast";

export function StartProductionButton({
  articleId,
}: {
  articleId: string;
}) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function start() {
    setLoading(true);

    const response = await fetch("/api/production/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ articleId }),
    });

    const result = await response.json();

    setLoading(false);

    if (!response.ok) {
      toast.error("Production failed", result.error);
      return;
    }

    toast.success("Production started", "Workflow completed successfully.");
  }

  return (
    <Button onClick={start} disabled={loading}>
      {loading ? "Starting..." : "🚀 Start Production"}
    </Button>
  );
}