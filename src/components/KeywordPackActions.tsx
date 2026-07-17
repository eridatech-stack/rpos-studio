"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/hooks/useToast";

export function KeywordPackActions({
  keywordPackId,
  selectedItemIds,
  onClearSelection,
}: {
  keywordPackId: string;
  selectedItemIds: string[];
  onClearSelection: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [keywordStatus, setKeywordStatus] = useState("needs_review");
  const router = useRouter();
  const toast = useToast();

  async function postAction(
    action: string,
    body?: Record<string, unknown>
  ) {
    setLoading(action);

    try {
      const response = await fetch(
        `/api/keyword-packs/${keywordPackId}/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        }
      );
      const result = await response.json();

      if (!response.ok) {
        toast.error(
          "Keyword pack action failed",
          result.error || "Unable to update keyword pack."
        );
        return;
      }

      toast.success(
        "Keyword pack updated",
        action === "import"
          ? importSummary(result)
          : result.message || "Action completed."
      );
      onClearSelection();
      router.refresh();
    } catch (error) {
      toast.error(
        "Keyword pack action failed",
        error instanceof Error ? error.message : "Unexpected error."
      );
    } finally {
      setLoading(null);
    }
  }

  const selectedBody = {
    itemIds: selectedItemIds,
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={loading !== null}
        onClick={() => postAction("start")}
      >
        Start
      </Button>

      <Button
        type="button"
        variant="secondary"
        disabled={loading !== null}
        onClick={() => postAction("retry")}
      >
        Retry
      </Button>

      <Button
        type="button"
        variant="danger"
        disabled={loading !== null}
        onClick={() => postAction("cancel")}
      >
        Cancel
      </Button>

      <Button
        type="button"
        variant="success"
        disabled={loading !== null || selectedItemIds.length === 0}
        onClick={() =>
          postAction("review", {
            ...selectedBody,
            reviewStatus: "approved",
          })
        }
      >
        Approve Selected
      </Button>

      <Button
        type="button"
        variant="secondary"
        disabled={loading !== null || selectedItemIds.length === 0}
        onClick={() =>
          postAction("review", {
            ...selectedBody,
            reviewStatus: "rejected",
          })
        }
      >
        Reject Selected
      </Button>

      <Button
        type="button"
        variant="success"
        disabled={loading !== null}
        onClick={() =>
          postAction("review", {
            reviewStatus: "approved",
          })
        }
      >
        Approve All
      </Button>

      <Button
        type="button"
        variant="secondary"
        disabled={loading !== null}
        onClick={() =>
          postAction("review", {
            reviewStatus: "rejected",
          })
        }
      >
        Reject All
      </Button>

      <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        Import as
        <select
          value={keywordStatus}
          onChange={(event) => setKeywordStatus(event.target.value)}
          disabled={loading !== null}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="needs_review">Needs review</option>
          <option value="approved">Approved</option>
        </select>
      </label>

      <Button
        type="button"
        disabled={loading !== null}
        onClick={() =>
          postAction("import", {
            keywordStatus,
          })
        }
      >
        Import Approved
      </Button>
    </div>
  );
}

function importSummary(result: any) {
  return [
    `${Number(result.keywordsCreated ?? 0)} keyword(s) imported`,
    `${Number(result.keywordsSkipped ?? 0)} skipped`,
    `${Number(result.duplicatesFound ?? 0)} duplicate(s)`,
    `${Number(result.failures?.length ?? 0)} failure(s)`,
  ].join(", ");
}
