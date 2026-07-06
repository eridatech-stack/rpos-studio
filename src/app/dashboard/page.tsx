import { Nav } from "@/components/Nav";
import { getDashboardStats } from "@/repositories/dashboardRepository";

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: number | string | null;
  subtitle: string;
  icon: string;
  color: "blue" | "green" | "purple" | "orange" | "red";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </div>
          <div className="mt-3 text-4xl font-black">{value ?? 0}</div>
          <div className="mt-3 text-sm text-slate-500">{subtitle}</div>
        </div>

        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl ${colors[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-green-50 text-green-700",
    running: "bg-blue-50 text-blue-700",
    failed: "bg-red-50 text-red-700",
    queued: "bg-orange-50 text-orange-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <>
      <Nav />

      <main className="p-8">
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-8 text-white shadow-lg">
          <h1 className="text-4xl font-black">Production Dashboard</h1>
          <p className="mt-3 max-w-2xl text-slate-200">
            Monitor your content pipeline, AI jobs, WordPress drafts, and production health.
          </p>
        </div>

        <section className="mt-8">
          <h2 className="text-xl font-bold">Content Pipeline</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard
              title="Approved Keywords"
              value={stats.keywords.approved}
              subtitle="Ready for AI outlines"
              icon="🧠"
              color="green"
            />

            <StatCard
              title="Outlines Ready"
              value={stats.articles.outline_ready}
              subtitle="Ready for draft generation"
              icon="🧩"
              color="purple"
            />

            <StatCard
              title="Drafts Ready"
              value={stats.articles.draft_ready}
              subtitle="Waiting for review"
              icon="📝"
              color="blue"
            />

            <StatCard
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
            <StatCard
              title="Total Keywords"
              value={stats.keywords.total}
              subtitle="Keyword database size"
              icon="🔑"
              color="blue"
            />

            <StatCard
              title="Total Articles"
              value={stats.articles.total}
              subtitle="All generated articles"
              icon="📚"
              color="purple"
            />

            <StatCard
              title="Running Jobs"
              value={stats.jobs.running}
              subtitle="Currently processing"
              icon="⚙️"
              color="orange"
            />

            <StatCard
              title="Failed Jobs"
              value={stats.jobs.failed}
              subtitle="Need attention"
              icon="⚠️"
              color="red"
            />
          </div>
        </section>

        <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Recent Jobs</h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest AI and publishing operations.
              </p>
            </div>
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

                  <StatusBadge status={job.status} />
                </div>

                {job.error_message && (
                  <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {job.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}