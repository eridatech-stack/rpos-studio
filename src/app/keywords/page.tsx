import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DeleteKeywordButton } from "@/components/DeleteKeywordButton";
import { getKeywords } from "@/repositories/keywordRepository";
import type { keywords_status } from "@prisma/client";
import {
  Card,
  EmptyState,
  PageHeader,
  StatusChip,
} from "@/components/ui";

export default async function KeywordsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() || "";
  const status = parseKeywordStatus(params.status);
  const keywords: any[] = await getKeywords({
    query,
    status,
  });

  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title="Keyword Library"
          subtitle="Manage keyword opportunities, classifications, priorities, and production status."
          actions={
            <Link
              href="/keywords/import"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700"
            >
              📥 Import Keywords
            </Link>
          }
        />

        <Card className="mb-6">
          <form
            action="/keywords"
            className="flex flex-col gap-3 md:flex-row md:items-end"
          >
            <label className="flex-1">
              <span className="text-sm font-semibold text-slate-500">
                Search keywords
              </span>

              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search keyword, category, cluster, status, notes..."
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="md:w-56">
              <span className="text-sm font-semibold text-slate-500">
                Status
              </span>

              <select
                name="status"
                defaultValue={status || ""}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All statuses</option>
                <option value="new">New</option>
                <option value="needs_review">Needs review</option>
                <option value="approved">Approved</option>
                <option value="planned">Planned</option>
                <option value="used">Used</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700"
              >
                Search
              </button>

              {(query || status) && (
                <Link
                  href="/keywords"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Clear
                </Link>
              )}
            </div>
          </form>

          {(query || status) && (
            <div className="mt-3 text-sm text-slate-500">
              Showing {keywords.length} result
              {keywords.length === 1 ? "" : "s"}
              {query && (
                <>
                  {" "}for{" "}
                  <span className="font-semibold text-slate-700">
                    {query}
                  </span>
                </>
              )}
              {status && (
                <>
                  {" "}with status{" "}
                  <span className="font-semibold text-slate-700">
                    {friendlyValue(status)}
                  </span>
                </>
              )}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          {keywords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-4">Keyword</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Cluster</th>
                    <th className="p-4">Intent</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Score</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Articles</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {keywords.map((item: any) => (
                    <tr
                      key={item.id}
                      className="border-t transition hover:bg-slate-50"
                    >
                      <td className="max-w-sm p-4 font-semibold text-slate-900">
                        {item.keyword}
                      </td>

                      <td className="p-4">
                        {item.categories?.name || "—"}
                      </td>

                      <td className="p-4">
                        {item.topic_clusters?.name || "—"}
                      </td>

                      <td className="p-4 capitalize">
                        {friendlyValue(item.intent)}
                      </td>

                      <td className="p-4 capitalize">
                        {friendlyValue(item.article_type)}
                      </td>

                      <td className="p-4">
                        <PriorityBadge priority={item.priority} />
                      </td>

                      <td className="p-4">
                        {item.opportunity_score ?? "—"}
                      </td>

                      <td className="p-4">
                        <StatusChip status={item.status} />
                      </td>

                      <td className="p-4">
                        {item._count?.articles ?? 0}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/keywords/${item.id}/edit`}
                            title="Edit keyword"
                            aria-label={`Edit ${item.keyword}`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg transition hover:border-blue-300 hover:bg-blue-50"
                          >
                            ✏️
                          </Link>

                          <DeleteKeywordButton
                            keywordId={item.id}
                            keyword={item.keyword}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                icon="🔑"
                title={
                  query || status
                    ? "No matching keywords"
                    : "No keywords yet"
                }
                description={
                  query || status
                    ? "Try a different keyword, category, cluster, status, or note search."
                    : "Import keywords or use Developer Tools to seed approved keyword opportunities."
                }
              />
            </div>
          )}
        </Card>
      </main>
    </AppShell>
  );
}

function PriorityBadge({
  priority,
}: {
  priority?: string | null;
}) {
  const styles: Record<string, string> = {
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-slate-100 text-slate-700",
  };

  const safePriority = priority || "unknown";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
        styles[safePriority] || "bg-slate-100 text-slate-700"
      }`}
    >
      {friendlyValue(safePriority)}
    </span>
  );
}

function friendlyValue(
  value: string | null | undefined
) {
  return value ? value.replaceAll("_", " ") : "—";
}

function parseKeywordStatus(value: string | undefined) {
  const statuses: keywords_status[] = [
    "new",
    "approved",
    "planned",
    "used",
    "rejected",
    "needs_review",
  ];

  return statuses.includes(value as keywords_status)
    ? (value as keywords_status)
    : undefined;
}
