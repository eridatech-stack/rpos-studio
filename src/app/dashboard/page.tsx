import { AppShell } from "@/components/AppShell";
import { getDashboardStats } from "@/repositories/dashboardRepository";
import { Card, MetricCard, PageHeader, StatusChip } from "@/components/ui";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <AppShell>
      <main className="p-8">
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-8 text-white shadow-lg">
          <PageHeader
            title="Production Dashboard"
            subtitle="Monitor your content pipeline, AI jobs, WordPress drafts, and production health."
          />
        </div>

        <section>
          <h2 className="text-xl font-bold">Content Pipeline</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <MetricCard
              title="Approved Keywords"
              value={stats.keywords.approved}
              subtitle="Ready for AI outlines"
              icon="🧠"
              color="green"
            />

            <MetricCard
              title="Outlines Ready"
              value={stats.articles.outline_ready}
              subtitle="Ready for draft generation"
              icon="🧩"
              color="purple"
            />

            <MetricCard
              title="Drafts Ready"
              value={stats.articles.draft_ready}
              subtitle="Waiting for review"
              icon="📝"
              color="blue"
            />

            <MetricCard
              title="WordPress Drafts"
              value={stats.articles.wordpress_draft}
              subtitle="Ready inside WordPress"
              icon="🚀"
              color="orange"
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold">System Health</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <MetricCard
              title="Total Keywords"
              value={stats.keywords.total}
              subtitle="Keyword database size"
              icon="🔑"
              color="blue"
            />

            <MetricCard
              title="Total Articles"
              value={stats.articles.total}
              subtitle="All generated articles"
              icon="📚"
              color="purple"
            />

            <MetricCard
              title="Running Jobs"
              value={stats.jobs.running}
              subtitle="Currently processing"
              icon="⚙️"
              color="orange"
            />

            <MetricCard
              title="Failed Jobs"
              value={stats.jobs.failed}
              subtitle="Need attention"
              icon="⚠️"
              color="red"
            />
          </div>
        </section>

        <Card className="mt-8">
          <div>
            <h2 className="text-xl font-bold">Recent Jobs</h2>
            <p className="mt-1 text-sm text-slate-500">
              Latest AI and publishing operations.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {stats.recentJobs.map((job: any) => (
              <div
                key={job.id}
                className="rounded-xl border bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{job.job_type}</div>
                    <div className="mt-1 text-sm text-slate-500">
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
          </div>
        </Card>
      </main>
    </AppShell>
  );
}