import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AutoRefresh } from "@/components/AutoRefresh";
import { RetryProductionRunButton } from "@/components/RetryProductionRunButton";
import {
  Card,
  EmptyState,
  PageHeader,
  StatusChip,
} from "@/components/ui";
import { ProgressBar } from "@/shared/ui";
import {
  getProductionRun,
  getProductionRunEvents,
  getProductionRunSteps,
} from "@/modules/production/repository";
import type {
  ProductionRun,
  ProductionRunEvent,
  ProductionRunStep,
} from "@/modules/production/types";

export const dynamic = "force-dynamic";

export default async function ProductionRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [run, steps, events] = await Promise.all([
    getProductionRun(id),
    getProductionRunSteps(id),
    getProductionRunEvents(id),
  ]);

  if (!run) {
    notFound();
  }

  return (
    <AppShell>
      <main className="p-8">
        <div className="mb-6 text-sm text-slate-500">
          <Link
            href="/production/runs"
            className="font-medium text-blue-700 hover:underline"
          >
            Production Runs
          </Link>

          <span className="mx-2">/</span>
          <span>{shortId(run.id)}</span>
        </div>

        <PageHeader
          title={run.article_title || run.keyword || "Production run"}
          subtitle="Worker timeline, queue state, and step history."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <AutoRefresh />

              {run.status === "failed" && (
                <RetryProductionRunButton productionRunId={run.id} />
              )}

              <StatusChip status={run.status} />
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <h2 className="text-xl font-bold">Run Progress</h2>

                <p className="mt-1 text-sm text-slate-500">
                  {friendlyStepName(run.current_step, run.status)}
                </p>
              </div>

              <div className="text-right text-sm text-slate-500">
                <div>Attempts: {run.attempt_count ?? 0}</div>
                <div className="mt-1">
                  Duration: {formatDuration(run.duration_seconds)}
                </div>
                {run.worker_id && (
                  <div className="mt-1 max-w-xs truncate">
                    Worker: {run.worker_id}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <ProgressBar
                value={Number(run.progress_percent ?? 0)}
                label={friendlyStepName(run.current_step, run.status)}
              />
            </div>

            {run.error_message && (
              <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {run.error_message}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-bold">Run Details</h2>

            <dl className="mt-5 space-y-4 text-sm">
              <Detail label="Keyword" value={run.keyword} />
              <Detail label="Site" value={run.site_name || run.domain} />
              <Detail label="Run ID" value={run.id} mono />
              <Detail label="Keyword ID" value={run.keyword_id} mono />
              <Detail label="Article ID" value={run.article_id} mono />
              <Detail label="Created" value={formatDate(run.created_at)} />
              <Detail label="Started" value={formatDate(run.started_at)} />
              <Detail label="Locked" value={formatDate(run.locked_at)} />
              <Detail label="Finished" value={formatDate(run.finished_at)} />
              <Detail
                label="Last Activity"
                value={formatDate(run.last_activity_at)}
              />
              <Detail
                label="Duration"
                value={formatDuration(run.duration_seconds)}
              />
            </dl>
          </Card>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
          <Card>
            <h2 className="text-xl font-bold">Steps</h2>

            <div className="mt-5 space-y-3">
              {steps.map((step) => (
                <StepRow key={step.id} step={step} />
              ))}

              {steps.length === 0 && (
                <EmptyState
                  icon="📋"
                  title="No steps recorded"
                  description="Queued production steps will appear here."
                />
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold">Timeline</h2>

            <div className="mt-5">
              {events.length > 0 ? (
                <ol className="relative space-y-5 border-l border-slate-200 pl-6">
                  {events.map((event) => (
                    <TimelineItem key={event.id} event={event} />
                  ))}
                </ol>
              ) : (
                <EmptyState
                  icon="🕒"
                  title="No events recorded"
                  description="Worker events will appear here as the run moves through production."
                />
              )}
            </div>
          </Card>
        </section>
      </main>
    </AppShell>
  );
}

function StepRow({ step }: { step: ProductionRunStep }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-900">
            {step.step_name}
          </div>

          <div className="mt-1 text-xs text-slate-400">
            {step.step_code}
          </div>
        </div>

        <StatusChip status={step.status} />
      </div>

      <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
        <div>Started: {formatDate(step.started_at)}</div>
        <div>Finished: {formatDate(step.finished_at)}</div>
        <div>Duration: {formatDuration(step.duration_seconds)}</div>
      </div>

      {step.error_message && (
        <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {step.error_message}
        </div>
      )}
    </div>
  );
}

function TimelineItem({ event }: { event: ProductionRunEvent }) {
  const details = formatDetails(event.details_json);

  return (
    <li className="relative">
      <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-600" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">
              {friendlyEventType(event.event_type)}
            </span>

            {event.status && <StatusChip status={event.status} />}
          </div>

          <p className="mt-2 text-sm text-slate-600">{event.message}</p>
        </div>

        <time className="shrink-0 text-xs text-slate-400">
          {formatDate(event.created_at)}
        </time>
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
        {event.step_code && <span>Step: {event.step_code}</span>}
        <span>Event: {event.event_type}</span>
      </div>

      {details && (
        <pre className="mt-3 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
          {details}
        </pre>
      )}
    </li>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: unknown;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd
        className={`mt-1 break-words text-slate-900 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {displayValue(value)}
      </dd>
    </div>
  );
}

function friendlyStepName(
  step: string | null,
  status?: string | null
) {
  if (!step) {
    return status === "queued" ? "Waiting for worker" : "No active step";
  }

  const labels: Record<string, string> = {
    outline: "Generating outline",
    draft: "Generating article draft",
    featured_image: "Generating featured image",
    wordpress_draft: "Creating WordPress draft",
  };

  return labels[step] || step.replaceAll("_", " ");
}

function friendlyEventType(eventType: string) {
  return eventType
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: Date | string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "-";
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

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function shortId(id: string) {
  return id.slice(0, 8);
}

function formatDetails(details: unknown) {
  if (!details) {
    return null;
  }

  if (typeof details === "string") {
    try {
      return JSON.stringify(JSON.parse(details), null, 2);
    } catch {
      return details;
    }
  }

  return JSON.stringify(details, null, 2);
}
