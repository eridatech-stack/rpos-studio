"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/hooks/useToast";

export function ProduceKeywordButton({
  keywordId,
}: {
  keywordId: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function produce() {
    setLoading(true);

    try {
      const response = await fetch(
        "/api/production/start-keyword",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ keywordId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(
          "Unable to queue production",
          result.error || "Unexpected queue error.",
          12000
        );
        return;
      }

      toast.success(
        "Article queued",
        "The worker will generate the outline, draft, and WordPress draft in the background.",
        12000
      );

      router.refresh();
    } catch (error: unknown) {
      toast.error(
        "Unable to queue production",
        error instanceof Error
          ? error.message
          : "Unexpected error.",
        12000
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={produce}
      disabled={loading}
    >
      {loading
        ? "Adding to Queue..."
        : "🚀 Produce Article"}
    </Button>
  );
}