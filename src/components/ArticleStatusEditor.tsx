"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/hooks/useToast";

const articleStatuses = [
  "idea",
  "approved",
  "outline_ready",
  "draft_ready",
  "seo_ready",
  "image_ready",
  "wordpress_draft",
  "human_review",
  "published",
  "needs_update",
  "archived",
];

export function ArticleStatusEditor({
  articleId,
  currentStatus,
}: {
  articleId: string;
  currentStatus: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState(currentStatus || "idea");
  const [saving, setSaving] = useState(false);
  const unchanged = status === (currentStatus || "idea");

  async function saveStatus() {
    setSaving(true);

    try {
      const response = await fetch("/api/articles/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          articleId,
          status,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(
          "Status not updated",
          result.error || "Unable to update article status."
        );
        return;
      }

      toast.success(
        "Article status updated",
        `Status changed to ${friendlyStatus(status)}.`
      );
      router.refresh();
    } catch (error) {
      toast.error(
        "Status not updated",
        error instanceof Error
          ? error.message
          : "Unable to update article status."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <label className="block">
        <span className="text-sm font-semibold text-slate-500">
          Manual Status
        </span>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          {articleStatuses.map((value) => (
            <option key={value} value={value}>
              {friendlyStatus(value)}
            </option>
          ))}
        </select>
      </label>

      <Button
        type="button"
        onClick={saveStatus}
        disabled={saving || unchanged}
        variant="secondary"
        className="mt-3 w-full"
      >
        {saving ? "Saving..." : "Update Status"}
      </Button>
    </div>
  );
}

function friendlyStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
