import { AppShell } from "@/components/AppShell";
import { getProductionQueue } from "@/repositories/productionRepository";
import { Card, EmptyState, MetricCard, PageHeader, StatusChip } from "@/components/ui";
import { GenerateButton } from "@/components/GenerateButton";
import { GenerateDraftButton } from "@/components/GenerateDraftButton";
import { PublishWordPressButton } from "@/components/PublishWordPressButton";
import { BulkKeywordProduction } from "@/components/BulkKeywordProduction";

export default async function ProductionPage() {
  const data = await getProductionQueue();

  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title="Production Center"
          subtitle="Monitor AI jobs, publishing operations, and content production flow."
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard
            title="Queued"
            value={data.summary.queued}
            subtitle="Waiting to run"
            icon="⏳"
            color="orange"
          />

          <MetricCard
            title="Running"
            value={data.summary.running}
            subtitle="Currently processing"
            icon="⚙️"
            color="blue"
          />

          <MetricCard
            title="Completed"
            value={data.summary.completed}
            subtitle="Finished successfully"
            icon="✅"
            color="green"
          />

          <MetricCard
            title="Failed"
            value={data.summary.failed}
            subtitle="Needs attention"
            icon="⚠️"
            color="red"
          />
        </section>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <h2 className="text-xl font-bold">
              Approved Keywords
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select one or more keywords and add them
              to asynchronous production.
            </p>

            <div className="mt-5">
              <BulkKeywordProduction
                keywords={data.approvedKeywords}
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold">Outline Ready</h2>
            <p className="mt-1 text-sm text-slate-500">Ready for draft generation.</p>

            <div className="mt-5 space-y-3">
              {data.outlineReadyArticles.map((item: any) => (
                <div key={item.id} className="rounded-xl border bg-slate-50 p-4">
                  <div className="font-semibold">{item.title}</div>
                  <div className="mt-3">
                    <GenerateDraftButton articleId={item.id} />
                  </div>
                </div>
              ))}
              {data.outlineReadyArticles.length === 0 && (
              <EmptyState
                icon="🧩"
                title="No outlines ready"
                description="Generate article outlines from approved keywords."
              />
            )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold">Draft Ready</h2>
            <p className="mt-1 text-sm text-slate-500">Ready for WordPress draft.</p>

            <div className="mt-5 space-y-3">
              {data.draftReadyArticles.map((item: any) => (
                <div key={item.id} className="rounded-xl border bg-slate-50 p-4">
                  <div className="font-semibold">{item.title}</div>
                  <div className="mt-3">
                    <PublishWordPressButton articleId={item.id} />
                  </div>
                </div>
              ))}
              {data.draftReadyArticles.length === 0 && (
              <EmptyState
                icon="📝"
                title="No drafts ready"
                description="Generate article drafts before publishing to WordPress."
              />
            )}
            </div>
          </Card>
        </div>

        <Card className="mt-8">
          <div>
            <h2 className="text-xl font-bold">Production Queue</h2>
            <p className="mt-1 text-sm text-slate-500">
              Latest outline, draft, and WordPress production jobs.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {data.jobs.map((job: any) => (
              <div
                key={job.id}
                className="rounded-xl border bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold">{job.job_type}</div>

                    <div className="mt-1 text-sm text-slate-500">
                      {job.article_title || job.keyword || "No related item"}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      Created:{" "}
                      {job.created_at
                        ? new Date(job.created_at).toLocaleString()
                        : "—"}
                    </div>
                  </div>

                  <StatusChip status={job.status} />
                </div>

                {job.error_message && (
                  <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {job.error_message}
                  </div>
                )}
              </div>
            ))}

            {data.jobs.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">
                No production jobs yet.
              </div>
            )}
          </div>
        </Card>
      </main>
    </AppShell>
  );
}