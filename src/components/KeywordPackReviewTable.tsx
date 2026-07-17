"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeywordPackActions } from "@/components/KeywordPackActions";
import { Button, StatusChip } from "@/components/ui";
import { useToast } from "@/hooks/useToast";

type KeywordPackItem = {
  id: string;
  keyword: string;
  suggested_title?: string | null;
  category_name?: string | null;
  cluster_name?: string | null;
  is_pillar: boolean | number;
  intent: string;
  article_type: string;
  priority: string;
  estimated_search_volume?: number | null;
  estimated_difficulty?: number | null;
  ai_opportunity_score?: number | null;
  review_status: string;
  notes?: string | null;
};

export function KeywordPackReviewTable({
  keywordPackId,
  items,
  total,
  page,
  pageSize,
  query,
  reviewStatus,
}: {
  keywordPackId: string;
  items: KeywordPackItem[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  reviewStatus: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<KeywordPackItem | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const allSelected = useMemo(
    () =>
      items.length > 0 &&
      items.every((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );

  function toggleAll() {
    if (allSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !items.some((item) => item.id === id))
      );
      return;
    }

    setSelectedIds((current) => [
      ...new Set([...current, ...items.map((item) => item.id)]),
    ]);
  }

  function toggleOne(itemId: string) {
    setSelectedIds((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <form
          action={`/keywords/packs/${keywordPackId}`}
          className="flex flex-wrap items-end gap-3"
        >
          <label>
            <span className="text-sm font-semibold text-slate-500">Search</span>
            <input
              type="search"
              name="q"
              defaultValue={query}
              className="mt-2 w-64 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-500">Status</span>
            <select
              name="reviewStatus"
              defaultValue={reviewStatus}
              className="mt-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="edited">Edited</option>
              <option value="duplicate">Duplicate</option>
              <option value="imported">Imported</option>
            </select>
          </label>

          <button className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            Filter
          </button>
        </form>

        <KeywordPackActions
          keywordPackId={keywordPackId}
          selectedItemIds={selectedIds}
          onClearSelection={() => setSelectedIds([])}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </th>
              <th className="p-3">Keyword</th>
              <th className="p-3">Category</th>
              <th className="p-3">Cluster</th>
              <th className="p-3">Role</th>
              <th className="p-3">Intent</th>
              <th className="p-3">Type</th>
              <th className="p-3">Priority</th>
              <th className="p-3">Volume</th>
              <th className="p-3">Difficulty</th>
              <th className="p-3">Score</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Edit</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t hover:bg-slate-50">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleOne(item.id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </td>
                <td className="max-w-xs p-3 font-semibold text-slate-900">
                  {item.keyword}
                </td>
                <td className="p-3">{item.category_name || "-"}</td>
                <td className="p-3">{item.cluster_name || "-"}</td>
                <td className="p-3">
                  {item.is_pillar ? "Pillar" : "Supporting"}
                </td>
                <td className="p-3 capitalize">{friendly(item.intent)}</td>
                <td className="p-3 capitalize">{friendly(item.article_type)}</td>
                <td className="p-3 capitalize">{friendly(item.priority)}</td>
                <td className="p-3">{item.estimated_search_volume ?? "-"}</td>
                <td className="p-3">{item.estimated_difficulty ?? "-"}</td>
                <td className="p-3">{item.ai_opportunity_score ?? "-"}</td>
                <td className="p-3">
                  <StatusChip status={item.review_status} />
                </td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    title="Edit item"
                    onClick={() => setEditingItem(item)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white text-base hover:bg-slate-100"
                  >
                    ✎
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            No keyword pack items match the current filters.
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <div>
          Showing page {page} of {pageCount}, {total} total item
          {total === 1 ? "" : "s"}.
        </div>

        <div className="flex gap-2">
          <PageLink
            disabled={page <= 1}
            href={pageHref(keywordPackId, page - 1, query, reviewStatus)}
          >
            Previous
          </PageLink>
          <PageLink
            disabled={page >= pageCount}
            href={pageHref(keywordPackId, page + 1, query, reviewStatus)}
          >
            Next
          </PageLink>
        </div>
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6">
          <form
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
            onSubmit={async (event) => {
              event.preventDefault();
              setSaving(true);

              const formData = new FormData(event.currentTarget);

              try {
                const response = await fetch(
                  `/api/keyword-packs/${keywordPackId}/items/${editingItem.id}`,
                  {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      keyword: formData.get("keyword"),
                      suggestedTitle: formData.get("suggestedTitle"),
                      intent: formData.get("intent"),
                      articleType: formData.get("articleType"),
                      priority: formData.get("priority"),
                      estimatedSearchVolume: formData.get("estimatedSearchVolume"),
                      estimatedDifficulty: formData.get("estimatedDifficulty"),
                      aiOpportunityScore: formData.get("aiOpportunityScore"),
                      notes: formData.get("notes"),
                    }),
                  }
                );
                const result = await response.json();

                if (!response.ok) {
                  toast.error(
                    "Item not saved",
                    result.error || "Unable to update keyword item."
                  );
                  return;
                }

                toast.success("Item saved", "The keyword item was updated.");
                setEditingItem(null);
                router.refresh();
              } catch (error) {
                toast.error(
                  "Item not saved",
                  error instanceof Error ? error.message : "Unexpected error."
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">Edit Keyword Item</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Adjust the generated item before approval or import.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white text-slate-600 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <EditField label="Keyword" name="keyword" defaultValue={editingItem.keyword} />
              <EditField
                label="Suggested title"
                name="suggestedTitle"
                defaultValue={editingItem.suggested_title || ""}
              />
              <EditSelect label="Intent" name="intent" defaultValue={editingItem.intent}>
                <option value="informational">Informational</option>
                <option value="commercial">Commercial</option>
                <option value="transactional">Transactional</option>
                <option value="navigational">Navigational</option>
              </EditSelect>
              <EditSelect
                label="Article type"
                name="articleType"
                defaultValue={editingItem.article_type}
              >
                <option value="pillar">Pillar</option>
                <option value="cluster">Cluster</option>
                <option value="faq">FAQ</option>
                <option value="review">Review</option>
                <option value="comparison">Comparison</option>
                <option value="news">News</option>
                <option value="how_to">How-to</option>
              </EditSelect>
              <EditSelect label="Priority" name="priority" defaultValue={editingItem.priority}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </EditSelect>
              <EditField
                label="Estimated volume"
                name="estimatedSearchVolume"
                defaultValue={editingItem.estimated_search_volume ?? ""}
              />
              <EditField
                label="Estimated difficulty"
                name="estimatedDifficulty"
                defaultValue={editingItem.estimated_difficulty ?? ""}
              />
              <EditField
                label="AI opportunity score"
                name="aiOpportunityScore"
                defaultValue={editingItem.ai_opportunity_score ?? ""}
              />
              <label className="md:col-span-2">
                <span className="text-sm font-semibold text-slate-500">Notes</span>
                <textarea
                  name="notes"
                  defaultValue={editingItem.notes || ""}
                  className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Item"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function EditField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string | number;
}) {
  return (
    <label>
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function EditSelect({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-xl border border-slate-200 px-4 py-2 text-slate-300">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100"
    >
      {children}
    </Link>
  );
}

function pageHref(
  keywordPackId: string,
  page: number,
  query: string,
  reviewStatus: string
) {
  const params = new URLSearchParams();
  params.set("page", String(page));

  if (query) {
    params.set("q", query);
  }

  if (reviewStatus) {
    params.set("reviewStatus", reviewStatus);
  }

  return `/keywords/packs/${keywordPackId}?${params.toString()}`;
}

function friendly(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "-";
}
