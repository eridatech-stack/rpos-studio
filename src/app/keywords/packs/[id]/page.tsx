import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AutoRefresh } from "@/components/AutoRefresh";
import { KeywordPackReviewTable } from "@/components/KeywordPackReviewTable";
import {
  getKeywordPackById,
  getKeywordPackCategories,
  getKeywordPackClusters,
  getKeywordPackEvents,
  getKeywordPackItemsPage,
} from "@/modules/keyword-packs/repository";
import {
  Card,
  MetricCard,
  PageHeader,
  StatusChip,
} from "@/components/ui";
import { ProgressBar } from "@/shared/ui";
import { parseReviewStatus } from "@/modules/keyword-packs/apiValidation";

export default async function KeywordPackDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    page?: string;
    q?: string;
    reviewStatus?: string;
  }>;
}) {
  const { id } = await params;
  const queryParams = await searchParams;
  const pack = await getKeywordPackById(id);

  if (!pack) {
    notFound();
  }

  const page = positiveInt(queryParams.page, 1);
  const pageSize = 50;
  const query = queryParams.q?.trim() || "";
  const reviewStatus = queryParams.reviewStatus?.trim() || "";
  const safeReviewStatus = reviewStatus
    ? parseReviewStatus(reviewStatus)
    : undefined;

  const [categories, clusters, events, itemsPage] = await Promise.all([
    getKeywordPackCategories(id),
    getKeywordPackClusters(id),
    getKeywordPackEvents(id),
    getKeywordPackItemsPage({
      keywordPackId: id,
      query,
      reviewStatus: safeReviewStatus,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
  ]);

  return (
    <AppShell>
      <main className="p-4 sm:p-6 lg:p-8">
        <PageHeader
          title={pack.name}
          subtitle={pack.niche}
          actions={
            <div className="flex flex-wrap gap-3">
              <AutoRefresh />
              <Link
                href="/keywords/packs"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Back to Packs
              </Link>
            </div>
          }
        />

        <section className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-4">
          <MetricCard
            title="Requested"
            value={pack.requested_keyword_count}
            subtitle="Target size"
            icon="🔑"
          />
          <MetricCard
            title="Generated"
            value={Number(pack.item_count ?? 0)}
            subtitle="Draft items"
            icon="🧾"
          />
          <MetricCard
            title="Approved"
            value={Number(pack.approved_item_count ?? 0)}
            subtitle="Ready to import"
            icon="✅"
            color="green"
          />
          <MetricCard
            title="Imported"
            value={Number(pack.imported_item_count ?? 0)}
            subtitle="Live keywords"
            icon="📥"
            color="blue"
          />
          <MetricCard
            title="Duplicates"
            value={Number(pack.duplicate_item_count ?? 0)}
            subtitle="Already in library"
            icon="!"
            color="orange"
          />
        </section>

        <section className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-4">
          <MetricCard
            title="Pending"
            value={Number(pack.pending_item_count ?? 0)}
            subtitle="Needs review"
            icon="..."
          />
          <MetricCard
            title="Rejected"
            value={Number(pack.rejected_item_count ?? 0)}
            subtitle="Excluded from import"
            icon="-"
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold uppercase text-slate-500">
              Status
            </div>
            <div className="mt-3">
              <StatusChip status={pack.status} />
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Progress</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Background generation status and current stage.
                </p>
              </div>
              <StatusChip status={pack.status} />
            </div>
            <div className="mt-5">
              <ProgressBar
                value={Number(pack.progress_percent ?? 0)}
                label={friendlyStep(pack.current_step, pack.status)}
              />
            </div>
            {pack.error_message && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {pack.error_message}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-bold">Pack Details</h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-600">
              <Detail label="Site" value={pack.site_name} />
              <Detail label="Domain" value={pack.domain} />
              <Detail label="Mode" value={friendly(pack.generation_mode)} />
              <Detail label="Language" value={pack.target_language || "-"} />
              <Detail
                label="Created"
                value={
                  pack.created_at
                    ? new Date(pack.created_at).toLocaleString()
                    : "-"
                }
              />
            </div>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <Card>
            <h2 className="text-xl font-bold">Categories</h2>
            <div className="mt-4 space-y-3">
              {categories.slice(0, 8).map((category: any) => (
                <div
                  key={category.id}
                  className="rounded-xl border bg-slate-50 p-4"
                >
                  <div className="font-semibold text-slate-900">
                    {category.name}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {category.description || category.slug}
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="text-sm text-slate-500">
                  Categories will appear after generation starts.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold">Topic Clusters</h2>
            <div className="mt-4 space-y-3">
              {clusters.slice(0, 8).map((cluster: any) => (
                <div
                  key={cluster.id}
                  className="rounded-xl border bg-slate-50 p-4"
                >
                  <div className="font-semibold text-slate-900">
                    {cluster.name}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Pillar: {cluster.pillar_keyword || "-"}
                  </div>
                </div>
              ))}
              {clusters.length === 0 && (
                <div className="text-sm text-slate-500">
                  Clusters will appear after generation starts.
                </div>
              )}
            </div>
          </Card>
        </div>

        <Card className="mt-8">
          <h2 className="text-xl font-bold">Keyword Review</h2>
          <p className="mt-1 text-sm text-slate-500">
            Metrics are AI estimates for prioritization and should be validated
            with an SEO data provider before major publishing decisions.
          </p>
          <div className="mt-5">
            <KeywordPackReviewTable
              keywordPackId={id}
              items={itemsPage.items}
              total={itemsPage.total}
              page={page}
              pageSize={pageSize}
              query={query}
              reviewStatus={reviewStatus}
            />
          </div>
        </Card>

        <Card className="mt-8">
          <h2 className="text-xl font-bold">Timeline</h2>
          <div className="mt-5 space-y-3">
            {events.map((event: any) => (
              <div key={event.id} className="rounded-xl border bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {friendly(event.event_type)}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {event.message}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {event.created_at
                      ? new Date(event.created_at).toLocaleString()
                      : "-"}
                  </div>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <div className="text-sm text-slate-500">
                Timeline events will appear when the pack is created or queued.
              </div>
            )}
          </div>
        </Card>
      </main>
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right text-slate-800">{value}</span>
    </div>
  );
}

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function friendly(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "-";
}

function friendlyStep(step: string | null, status: string | null) {
  if (!step) {
    return status === "queued" ? "Waiting for worker" : friendly(status);
  }

  return friendly(step);
}
