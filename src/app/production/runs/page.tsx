import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getProductionRuns } from "@/modules/production/repository";
import { Card, EmptyState, MetricCard, PageHeader, StatusChip } from "@/components/ui";
import { ProgressBar } from "@/shared/ui";

export default async function ProductionRunsPage() {
  const runs = await getProductionRuns();

  const running = runs.filter((run: any) => run.status === "running").length;
  const completed = runs.filter((run: any) => run.status === "completed").length;
  const failed = runs.filter((run: any) => run.status === "failed").length;
  const queued = runs.filter((run: any) => run.status === "queued").length;

  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title="Production Runs"
          subtitle="Track full article production workflows from start to finish."
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard title="Queued" value={queued} subtitle="Waiting to start" icon="⏳" color="orange" />
          <MetricCard title="Running" value={running} subtitle="Currently processing" icon="⚙️" color="blue" />
          <MetricCard title="Completed" value={completed} subtitle="Finished workflows" icon="✅" color="green" />
          <MetricCard title="Failed" value={failed} subtitle="Need attention" icon="⚠️" color="red" />
        </section>

        <Card className="mt-8">
          <div className="space-y-3">
            {runs.map((run: any) => (
              <Link
                key={run.id}
                href={`/production/runs/${run.id}`}
                className="block rounded-xl border bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold">
                      {run.article_title || "Untitled article"}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      Current step: {run.current_step || "—"}
                    </div>

                    <div className="mt-3 max-w-md">
                      <ProgressBar value={run.progress_percent ?? 0} />
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      Created: {run.created_at ? new Date(run.created_at).toLocaleString() : "—"}
                    </div>
                  </div>

                  <StatusChip status={run.status} />
                </div>

                {run.error_message && (
                  <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {run.error_message}
                  </div>
                )}
              </Link>
            ))}

            {runs.length === 0 && (
              <EmptyState
                icon="🏃"
                title="No production runs yet"
                description="Start production from an article to create your first run."
              />
            )}
          </div>
        </Card>
      </main>
    </AppShell>
  );
}