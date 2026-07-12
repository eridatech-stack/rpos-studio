import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { BulkKeywordProduction } from "@/components/BulkKeywordProduction";
import { getProductionQueue } from "@/repositories/productionRepository";
import {
  Card,
  EmptyState,
  MetricCard,
  PageHeader,
  StatusChip,
} from "@/components/ui";
import { ProgressBar } from "@/shared/ui";

export default async function ProductionPage() {
  const data = await getProductionQueue();

  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title="Production Center"
          subtitle="Queue approved keywords and monitor automated article production."
          actions={
            <Link
              href="/production/runs"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              View All Runs
            </Link>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard
            title="Approved Keywords"
            value={data.approvedKeywords.length}
            subtitle="Available for production"
            icon="🔑"
            color="purple"
          />

          <MetricCard
            title="Queued"
            value={data.summary.queued}
            subtitle="Waiting for a worker"
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
            title="Failed"
            value={data.summary.failed}
            subtitle="Need attention"
            icon="⚠️"
            color="red"
          />
        </section>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <div>
              <h2 className="text-xl font-bold">Approved Keywords</h2>

              <p className="mt-1 text-sm text-slate-500">
                Select one or more keywords and add them to asynchronous
                production.
              </p>
            </div>

            <div className="mt-5">
              <BulkKeywordProduction keywords={data.approvedKeywords} />
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Active Production</h2>

                <p className="mt-1 text-sm text-slate-500">
                  Queued and running article workflows.
                </p>
              </div>

              <Link
                href="/production/runs"
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                View history
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {data.activeRuns.map((run: any) => (
                <Link
                  key={run.id}
                  href={`/production/runs/${run.id}`}
                  className="block rounded-xl border bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900">
                        {run.article_title ||
                          run.keyword ||
                          "Production workflow"}
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        Current step:{" "}
                        {friendlyStepName(run.current_step, run.status)}
                      </div>
                    </div>

                    <StatusChip status={run.status} />
                  </div>

                  <div className="mt-4">
                    <ProgressBar
                      value={Number(run.progress_percent ?? 0)}
                      label={
                        run.status === "queued"
                          ? "Waiting for worker"
                          : friendlyStepName(run.current_step, run.status)
                      }
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>Attempts: {run.attempt_count ?? 0}</span>

                    <span>
                      Created:{" "}
                      {run.created_at
                        ? new Date(run.created_at).toLocaleString()
                        : "—"}
                    </span>

                    {run.worker_id && <span>Worker: {run.worker_id}</span>}
                  </div>
                </Link>
              ))}

              {data.activeRuns.length === 0 && (
                <EmptyState
                  icon="✅"
                  title="No active production"
                  description="Select approved keywords to add new article workflows to the queue."
                />
              )}
            </div>
          </Card>
        </div>

        <Card className="mt-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Failed Production</h2>

              <p className="mt-1 text-sm text-slate-500">
                Workflows that require investigation or retry.
              </p>
            </div>

            <Link
              href="/production/runs"
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              View all runs
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {data.failedRuns.map((run: any) => (
              <Link
                key={run.id}
                href={`/production/runs/${run.id}`}
                className="block rounded-xl border border-red-100 bg-red-50/50 p-4 transition hover:bg-red-50"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900">
                      {run.article_title ||
                        run.keyword ||
                        "Failed production workflow"}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      Failed step:{" "}
                      {friendlyStepName(run.current_step, run.status)}
                    </div>

                    {run.error_message && (
                      <div className="mt-3 rounded-lg bg-white/80 p-3 text-sm text-red-700">
                        {run.error_message}
                      </div>
                    )}
                  </div>

                  <StatusChip status={run.status} />
                </div>

                <div className="mt-3 text-xs text-slate-400">
                  Attempts: {run.attempt_count ?? 0}
                  {" · "}
                  Finished:{" "}
                  {run.finished_at
                    ? new Date(run.finished_at).toLocaleString()
                    : "—"}
                </div>
              </Link>
            ))}

            {data.failedRuns.length === 0 && (
              <EmptyState
                icon="🎉"
                title="No failed workflows"
                description="All recent production workflows completed without unresolved errors."
              />
            )}
          </div>
        </Card>
      </main>
    </AppShell>
  );
}

function friendlyStepName(
  step: string | null,
  status?: string | null
) {
  if (!step) {
    return status === "queued" ? "Waiting for worker" : "—";
  }

  const labels: Record<string, string> = {
    outline: "Generating outline",
    draft: "Generating article draft",
    wordpress_draft: "Creating WordPress draft",
  };

  return labels[step] || step.replaceAll("_", " ");
}