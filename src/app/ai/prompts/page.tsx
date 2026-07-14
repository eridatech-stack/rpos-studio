import { AppShell } from "@/components/AppShell";
import { ActivatePromptButton } from "@/components/ActivatePromptButton";
import {
  getPromptPerformance,
  getPromptVersions,
} from "@/repositories/promptStudioRepository";
import { Card, EmptyState, PageHeader, StatusChip } from "@/components/ui";
import Link from "next/link";

export default async function PromptStudioPage() {
  const [prompts, performance] = await Promise.all([
    getPromptVersions(),
    getPromptPerformance(),
  ]);

  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title="Prompt Studio"
          subtitle="View and manage AI prompts used by the RPOS production pipeline."
        />

        <Card className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                Prompt Performance
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Usage, reliability, and cost for prompt versions used by jobs.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {performance.map((prompt: any) => (
              <div
                key={`${prompt.promptId}-${prompt.promptVersion}`}
                className="rounded-xl border bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      {prompt.promptName || prompt.promptKey}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      {prompt.promptKey} · Version{" "}
                      {prompt.promptVersion || "-"} ·{" "}
                      {prompt.model || "-"}
                    </div>
                  </div>

                  <div className="text-sm font-semibold text-slate-600">
                    {formatPercent(
                      prompt.completedRuns,
                      prompt.totalRuns
                    )}{" "}
                    success
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-3 xl:grid-cols-6">
                  <Metric label="Runs" value={prompt.totalRuns} />
                  <Metric
                    label="Failed"
                    value={prompt.failedRuns}
                  />
                  <Metric
                    label="Avg Time"
                    value={formatDuration(
                      prompt.averageDurationSeconds
                    )}
                  />
                  <Metric
                    label="Input"
                    value={formatNumber(prompt.inputTokens)}
                  />
                  <Metric
                    label="Output"
                    value={formatNumber(prompt.outputTokens)}
                  />
                  <Metric
                    label="Cost"
                    value={formatCurrency(prompt.estimatedCost)}
                  />
                </div>
              </div>
            ))}

            {performance.length === 0 && (
              <EmptyState
                icon="📊"
                title="No prompt performance yet"
                description="New outline and draft jobs will add prompt usage metrics here."
              />
            )}
          </div>
        </Card>

        <Card>
          <div className="space-y-3">
            {prompts.map((prompt: any) => (
              <div
                key={prompt.id}
                className="rounded-xl border bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold">
                      <Link
                        href={`/ai/prompts/${prompt.id}`}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        {prompt.name}
                      </Link>
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      Key: {prompt.prompt_key} · Model: {prompt.model} · Temp:{" "}
                      {prompt.temperature}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      Version {prompt.version} · {prompt.site_name || "Global"}
                    </div>

                    {!prompt.active && (
                      <div className="mt-3">
                        <ActivatePromptButton promptId={prompt.id} />
                      </div>
                    )}
                  </div>

                  <StatusChip status={prompt.active ? "completed" : "planned"} />
                </div>
              </div>
            ))}

            {prompts.length === 0 && (
              <EmptyState
                icon="🤖"
                title="No prompts yet"
                description="Add prompts to the prompt_versions table to power AI workflows."
              />
            )}
          </div>
        </Card>
      </main>
    </AppShell>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 truncate font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}

function formatPercent(value: number, total: number) {
  if (!total) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) {
    return "-";
  }

  const totalSeconds = Number(seconds);

  if (!Number.isFinite(totalSeconds)) {
    return "-";
  }

  if (totalSeconds < 60) {
    return `${Math.round(totalSeconds)}s`;
  }

  return `${Math.floor(totalSeconds / 60)}m ${Math.round(
    totalSeconds % 60
  )}s`;
}

function formatNumber(value: number | null | undefined) {
  return typeof value === "number"
    ? value.toLocaleString()
    : "-";
}

function formatCurrency(value: number | null | undefined) {
  return typeof value === "number"
    ? `$${value.toFixed(6)}`
    : "-";
}
