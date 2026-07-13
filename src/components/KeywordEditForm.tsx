"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/hooks/useToast";

type Option = {
  id: string;
  name: string;
};

type KeywordFormData = {
  id: string;
  keyword: string;
  category_id: string | null;
  cluster_id: string | null;
  intent: string | null;
  article_type: string | null;
  priority: string | null;
  opportunity_score: number | null;
  search_volume: number | null;
  difficulty: number | null;
  status: string | null;
  notes: string | null;
};

export function KeywordEditForm({
  keyword,
  categories,
  clusters,
}: {
  keyword: KeywordFormData;
  categories: Option[];
  clusters: Option[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    keyword: keyword.keyword,
    categoryId: keyword.category_id || "",
    clusterId: keyword.cluster_id || "",
    intent: keyword.intent || "informational",
    articleType: keyword.article_type || "cluster",
    priority: keyword.priority || "medium",
    opportunityScore:
      keyword.opportunity_score?.toString() || "",
    searchVolume:
      keyword.search_volume?.toString() || "",
    difficulty:
      keyword.difficulty?.toString() || "",
    status: keyword.status || "needs_review",
    notes: keyword.notes || "",
  });

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(
        "/api/keywords/update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            keywordId: keyword.id,
            ...form,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(
          "Keyword update failed",
          result.error ||
            "Unable to update the keyword.",
          15000
        );

        return;
      }

      toast.success(
        "Keyword updated",
        "The keyword changes were saved successfully.",
        10000
      );

      router.push("/keywords");
      router.refresh();
    } catch (error: unknown) {
      toast.error(
        "Keyword update failed",
        error instanceof Error
          ? error.message
          : "Unexpected error.",
        15000
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Field label="Keyword">
        <input
          value={form.keyword}
          onChange={(event) =>
            updateField(
              "keyword",
              event.target.value
            )
          }
          required
          className="w-full rounded-xl border border-slate-300 bg-white p-3"
        />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Category">
          <select
            value={form.categoryId}
            onChange={(event) =>
              updateField(
                "categoryId",
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white p-3"
          >
            <option value="">No category</option>

            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Topic Cluster">
          <select
            value={form.clusterId}
            onChange={(event) =>
              updateField(
                "clusterId",
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white p-3"
          >
            <option value="">No cluster</option>

            {clusters.map((cluster) => (
              <option
                key={cluster.id}
                value={cluster.id}
              >
                {cluster.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Search Intent">
          <select
            value={form.intent}
            onChange={(event) =>
              updateField(
                "intent",
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white p-3"
          >
            <option value="informational">
              Informational
            </option>

            <option value="commercial">
              Commercial
            </option>

            <option value="transactional">
              Transactional
            </option>

            <option value="navigational">
              Navigational
            </option>
          </select>
        </Field>

        <Field label="Article Type">
          <select
            value={form.articleType}
            onChange={(event) =>
              updateField(
                "articleType",
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white p-3"
          >
            <option value="cluster">Cluster</option>
            <option value="pillar">Pillar</option>
            <option value="how_to">How To</option>
            <option value="comparison">
              Comparison
            </option>
            <option value="review">Review</option>
            <option value="faq">FAQ</option>
            <option value="news">News</option>
          </select>
        </Field>

        <Field label="Priority">
          <select
            value={form.priority}
            onChange={(event) =>
              updateField(
                "priority",
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white p-3"
          >
            <option value="high">High</option>
            <option value="medium">
              Medium
            </option>
            <option value="low">Low</option>
          </select>
        </Field>

        <Field label="Status">
          <select
            value={form.status}
            onChange={(event) =>
              updateField(
                "status",
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white p-3"
          >
            <option value="new">New</option>

            <option value="needs_review">
              Needs Review
            </option>

            <option value="approved">
              Approved
            </option>

            <option value="planned">
              Planned
            </option>

            <option value="rejected">
              Rejected
            </option>
          </select>
        </Field>

        <Field label="Search Volume">
          <input
            type="number"
            min="0"
            value={form.searchVolume}
            onChange={(event) =>
              updateField(
                "searchVolume",
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white p-3"
          />
        </Field>

        <Field label="Difficulty">
          <input
            type="number"
            min="0"
            value={form.difficulty}
            onChange={(event) =>
              updateField(
                "difficulty",
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white p-3"
          />
        </Field>

        <Field label="Opportunity Score">
          <input
            type="number"
            min="0"
            value={form.opportunityScore}
            onChange={(event) =>
              updateField(
                "opportunityScore",
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white p-3"
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          value={form.notes}
          onChange={(event) =>
            updateField(
              "notes",
              event.target.value
            )
          }
          rows={5}
          className="w-full rounded-xl border border-slate-300 bg-white p-3"
        />
      </Field>

      <div className="flex flex-wrap gap-3 border-t pt-6">
        <Button
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : "Save Keyword"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            router.push("/keywords")
          }
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-slate-700">
        {label}
      </div>

      {children}
    </label>
  );
}