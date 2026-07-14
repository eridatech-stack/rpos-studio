"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/hooks/useToast";
import type {
  QualityReviewChecks,
  QualityReviewState,
} from "@/modules/editorial/qualityReview";

const checklistItems: Array<{
  key: keyof QualityReviewChecks;
  label: string;
}> = [
  {
    key: "draftReviewed",
    label: "Draft reviewed",
  },
  {
    key: "factualAccuracy",
    label: "Facts checked",
  },
  {
    key: "seoMetadata",
    label: "SEO metadata checked",
  },
  {
    key: "linksReviewed",
    label: "Links reviewed",
  },
  {
    key: "imageReviewed",
    label: "Featured image reviewed",
  },
  {
    key: "wordpressPreview",
    label: "WordPress preview checked",
  },
];

export function QualityReviewChecklist({
  articleId,
  initialReview,
}: {
  articleId: string;
  initialReview: QualityReviewState;
}) {
  const [checks, setChecks] = useState(initialReview.checks);
  const [notes, setNotes] = useState(initialReview.notes);
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const toast = useToast();

  const complete = useMemo(
    () => Object.values(checks).every(Boolean),
    [checks]
  );

  function toggleCheck(key: keyof QualityReviewChecks) {
    setChecks((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  async function saveReview() {
    setSaving(true);

    try {
      const response = await fetch("/api/editorial/quality-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          articleId,
          checks,
          notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(
          "Quality review not saved",
          result.error || "Unable to save quality review.",
          12000
        );
        return;
      }

      toast.success(
        "Quality review saved",
        complete
          ? "This article is ready for approval."
          : "Checklist progress was saved.",
        10000
      );

      router.refresh();
    } catch (error: unknown) {
      toast.error(
        "Quality review not saved",
        error instanceof Error
          ? error.message
          : "Unexpected error.",
        12000
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Quality Review</h2>

          <p className="mt-1 text-sm text-slate-500">
            Required before publishing approval.
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            complete
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {complete ? "Complete" : "Incomplete"}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {checklistItems.map((item) => (
          <label
            key={item.key}
            className="flex cursor-pointer items-center gap-3 rounded-lg border bg-slate-50 p-3 text-sm font-medium text-slate-700"
          >
            <input
              type="checkbox"
              checked={checks[item.key]}
              onChange={() => toggleCheck(item.key)}
              className="h-4 w-4 rounded border-slate-300"
            />

            <span>{item.label}</span>
          </label>
        ))}
      </div>

      <label className="mt-5 block">
        <span className="text-sm font-semibold text-slate-500">
          Review notes
        </span>

        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      {initialReview.updatedAt && (
        <div className="mt-3 text-xs text-slate-400">
          Last saved: {new Date(initialReview.updatedAt).toLocaleString()}
        </div>
      )}

      <div className="mt-5">
        <Button
          type="button"
          onClick={saveReview}
          disabled={saving}
          variant={complete ? "success" : "primary"}
        >
          {saving ? "Saving..." : "Save Quality Review"}
        </Button>
      </div>
    </div>
  );
}
