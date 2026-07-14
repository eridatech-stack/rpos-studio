import { AppShell } from "@/components/AppShell";
import { getAllJobs } from "@/repositories/productionRepository";
import { Card, EmptyState, PageHeader, StatusChip } from "@/components/ui";

export default async function JobsPage() {
  const jobs = await getAllJobs();

  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title="Jobs"
          subtitle="Review AI generation, draft creation, and WordPress publishing history."
        />

        <Card>
          <div className="space-y-3">
            {jobs.map((job: any) => (
              <JobRow key={job.id} job={job} />
            ))}

            {jobs.length === 0 && (
              <EmptyState
                icon="📋"
                title="No jobs yet"
                description="Production jobs will appear here after outline, draft, or WordPress actions run."
              />
            )}
          </div>
        </Card>
      </main>
    </AppShell>
  );
}

function JobRow({ job }: { job: any }) {
  const aiUsage = parseAiUsage(job.output_data);

  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
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

      {aiUsage && (
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
          <UsageValue label="Model" value={aiUsage.model} />
          <UsageValue
            label="Input"
            value={formatNumber(aiUsage.promptTokens)}
          />
          <UsageValue
            label="Output"
            value={formatNumber(aiUsage.completionTokens)}
          />
          <UsageValue
            label="Est. Cost"
            value={formatCurrency(aiUsage.estimatedCostUsd)}
          />
        </div>
      )}

      {job.error_message && (
        <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {job.error_message}
        </div>
      )}
    </div>
  );
}

function UsageValue({
  label,
  value,
}: {
  label: string;
  value: string;
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

function parseAiUsage(outputData: unknown) {
  const data =
    typeof outputData === "string"
      ? safeJsonParse(outputData)
      : outputData;

  if (
    !data ||
    typeof data !== "object" ||
    !("aiUsage" in data)
  ) {
    return null;
  }

  const aiUsage = (data as any).aiUsage;

  return aiUsage &&
    typeof aiUsage === "object" &&
    aiUsage.provider === "openai"
    ? aiUsage
    : null;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
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
