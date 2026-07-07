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
              <div key={job.id} className="rounded-xl border bg-slate-50 p-4">
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

                {job.error_message && (
                  <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {job.error_message}
                  </div>
                )}
              </div>
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