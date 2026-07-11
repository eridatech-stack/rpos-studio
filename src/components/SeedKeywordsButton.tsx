"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/hooks/useToast";

export function SeedKeywordsButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function seedKeywords() {
    setLoading(true);

    try {
      const response = await fetch(
        "/api/developer-tools/seed-keywords",
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(
          "Seeding failed",
          result.error || "Unable to seed keywords.",
          12000
        );
        return;
      }

      toast.success(
        "Keywords seeded",
        `${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped.`,
        12000
      );

      // Refreshes server-rendered data without reloading the whole browser page.
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected error.";

      toast.error(
        "Seeding failed",
        message,
        12000
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={seedKeywords}
      disabled={loading}
    >
      {loading
        ? "Seeding..."
        : "🌱 Seed Approved Keywords"}
    </Button>
  );
}