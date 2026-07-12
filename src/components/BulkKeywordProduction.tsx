"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/hooks/useToast";

type ApprovedKeyword = {
  id: string;
  keyword: string;
  intent?: string | null;
  priority?: string | null;
  opportunity_score?: number | null;
  category?: string | null;
  cluster?: string | null;
};

export function BulkKeywordProduction({
  keywords,
}: {
  keywords: ApprovedKeyword[];
}) {
  const [selectedIds, setSelectedIds] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(false);

  const router = useRouter();
  const toast = useToast();

  const allSelected = useMemo(
    () =>
      keywords.length > 0 &&
      selectedIds.length === keywords.length,
    [keywords.length, selectedIds.length]
  );

  function toggleKeyword(keywordId: string) {
    setSelectedIds((current) =>
      current.includes(keywordId)
        ? current.filter(
            (id) => id !== keywordId
          )
        : [...current, keywordId]
    );
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(
      keywords.map((keyword) => keyword.id)
    );
  }

  async function queueSelected() {
    if (selectedIds.length === 0) {
      toast.warning(
        "No keywords selected",
        "Select at least one approved keyword.",
        10000
      );

      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/production/start-keywords-bulk",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            keywordIds: selectedIds,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(
          "Bulk queue failed",
          result.error ||
            "Unable to queue selected keywords.",
          15000
        );

        return;
      }

      if (result.failed > 0) {
        toast.warning(
          "Bulk queue partially completed",
          `${result.queued} queued and ${result.failed} failed.`,
          15000
        );
      } else {
        toast.success(
          "Keywords queued",
          `${result.queued} article production runs were added to the worker queue.`,
          15000
        );
      }

      setSelectedIds([]);
      router.refresh();
    } catch (error: unknown) {
      toast.error(
        "Bulk queue failed",
        error instanceof Error
          ? error.message
          : "Unexpected error.",
        15000
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={keywords.length === 0}
            className="h-4 w-4 rounded border-slate-300"
          />

          Select all
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-500">
            {selectedIds.length} selected
          </span>

          <Button
            onClick={queueSelected}
            disabled={
              loading ||
              selectedIds.length === 0
            }
          >
            {loading
              ? "Adding to Queue..."
              : `🚀 Queue ${selectedIds.length || ""} Selected`}
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {keywords.map((keyword) => {
          const selected =
            selectedIds.includes(keyword.id);

          return (
            <label
              key={keyword.id}
              className={`block cursor-pointer rounded-xl border p-4 transition ${
                selected
                  ? "border-blue-300 bg-blue-50"
                  : "bg-slate-50 hover:bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() =>
                    toggleKeyword(keyword.id)
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />

                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900">
                    {keyword.keyword}
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    {keyword.category || "—"}
                    {" · "}
                    {keyword.cluster || "—"}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>
                      Intent:{" "}
                      {keyword.intent || "—"}
                    </span>

                    <span>
                      Priority:{" "}
                      {keyword.priority || "—"}
                    </span>

                    <span>
                      Opportunity:{" "}
                      {keyword.opportunity_score ??
                        "—"}
                    </span>
                  </div>
                </div>
              </div>
            </label>
          );
        })}

        {keywords.length === 0 && (
          <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center">
            <div className="text-4xl">🔑</div>

            <h3 className="mt-3 font-bold text-slate-800">
              No approved keywords
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Approve or seed additional keywords
              to add content to the production
              queue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}