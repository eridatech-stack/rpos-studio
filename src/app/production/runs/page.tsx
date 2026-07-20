import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AutoRefresh } from "@/components/AutoRefresh";
import { getProductionRuns } from "@/modules/production/repository";
import {
  Card,
  EmptyState,
  MetricCard,
  PageHeader,
  StatusChip,
} from "@/components/ui";
import { ProgressBar } from "@/shared/ui";
import type { ProductionRun } from "@/modules/production/types";

export const dynamic = "force-dynamic";

export default async function ProductionRunsPage() {
  const runs = await getProductionRuns();

  const running = runs.filter((run) => run.status === "running").length;
  const stale = runs.filter((run) => isStaleRun(run)).length;
  const completed = runs.filter((run) => run.status === "completed").length;
  const failed = runs.filter((run) => run.status === "failed").length;
  const queued = runs.filter((run) => run.status === "queued").length;

  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title="Production Runs"
          subtitle="Track full article production workflows from start to finish."
          actions={<AutoRefresh />}
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <MetricCard
            title="Queued"
            value={queued}
            subtitle="Waiting to start"
            icon="⏳"
            color="orange"
          />
          <MetricCard
            title="Running"
            value={running}
            subtitle="Currently processing"
            icon="⚙️"
            color="blue"
          />
          <MetricCard
            title="Stale"
            value={stale}
            subtitle="Needs action"
            icon="🧯"
            color="red"
          />
          <MetricCard
            title="Completed"
            value={completed}
            subtitle="Finished workflows"
            icon="✅"
            color="green"
          />
          <MetricCard
            title="Failed"
            value={failed}
            subtitle="Need attention"
            icon="⚠️"
            color="red"
          />
        </section>

        <Card className="mt-8">
          <div className="space-y-3">
            {runs.map((run) => (
              <Link
                key={run.id}
                href={`/production/runs/${run.id}`}
                className="block rounded-xl border bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold">
                      {run.article_title ||
                        run.keyword ||
                        "Production workflow"}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      Current step: {friendlyStepName(run)}
                    </div>

                    <div className="mt-3 max-w-md">
                      <ProgressBar
                        value={Number(run.progress_percent ?? 0)}
                      />
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      Created:{" "}
                      {run.created_at
                        ? new Date(run.created_at).toLocaleString()
                        : "—"}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      Duration: {formatDuration(run.duration_seconds)}
                      {run.last_activity_at && (
                        <>
                          {" "}
                          · Last activity{" "}
                          {formatRelativeTime(run.last_activity_at)}
                        </>
                      )}
                    </div>
                  </div>

                  <StatusChip status={run.status} />
                </div>

                {isStaleRun(run) && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Stale worker lock. Open this run to restart or remove it.
                  </div>
                )}

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
                description="Queue approved keywords from the Production Center to create your first run."
              />
            )}
          </div>
        </Card>
      </main>
    </AppShell>
  );
}

function isStaleRun(run: ProductionRun) {
  return Boolean(Number(run.is_stale));
}

function friendlyStepName(run: ProductionRun) {
  if (!run.current_step) {
    return run.status === "queued" ? "Waiting for worker" : "—";
  }

  const labels: Record<string, string> = {
    outline: "Generating outline",
    draft: "Generating article draft",
    featured_image: "Generating featured image",
    wordpress_draft: "Creating WordPress draft",
  };

  return labels[run.current_step] || run.current_step.replaceAll("_", " ");
}

function formatDuration(seconds: number | string | null | undefined) {
  if (seconds === null || seconds === undefined || seconds === "") {
    return "-";
  }

  const totalSeconds = Number(seconds);

  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "-";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = Math.round(totalSeconds % 60);

  if (minutes < 1) {
    return `${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 1) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function formatRelativeTime(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  const timestamp = new Date(value).getTime();
  const diffSeconds = Math.max(
    0,
    Math.round((Date.now() - timestamp) / 1000)
  );

  if (diffSeconds < 60) {
    return "just now";
  }

  if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)}m ago`;
  }

  if (diffSeconds < 86400) {
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  }

  return new Date(value).toLocaleDateString();
}
