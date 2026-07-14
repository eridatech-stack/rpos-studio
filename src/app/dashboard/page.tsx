import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AutoRefresh } from "@/components/AutoRefresh";
import { SiteSelector } from "@/components/SiteSelector";
import {
  getDashboardStats,
  getSites,
} from "@/repositories/dashboardRepository";
import {
  Card,
  EmptyState,
  MetricCard,
  PageHeader,
  StatusChip,
} from "@/components/ui";
import { ProgressBar } from "@/shared/ui";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    siteId?: string;
  }>;
}) {
  const params = await searchParams;
  const sites = await getSites();

  if (sites.length === 0) {
    return (
      <AppShell>
        <main className="p-8">
          <PageHeader
            title="Operations Dashboard"
            subtitle="Monitor the RPOS content production pipeline."
          />

          <Card>
            <EmptyState
              icon="🌐"
              title="No active sites"
              description="Add or activate a site before using the operations dashboard."
            />
          </Card>
        </main>
      </AppShell>
    );
  }

  const selectedSite =
    sites.find(
      (site: any) => site.id === params.siteId
    ) ?? sites[0];

  const stats = await getDashboardStats(
    selectedSite.id
  );

  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title="Operations Dashboard"
          subtitle="Monitor production, editorial review, publishing, and content output."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <AutoRefresh />

              <SiteSelector
                sites={sites}
                selectedSiteId={selectedSite.id}
              />
            </div>
          }
        />

        <div className="mb-8 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-500">
            Current workspace
          </div>

          <div className="mt-1 text-xl font-bold">
            {selectedSite.site_name}
          </div>

          <a
            href={selectedSite.domain}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm text-blue-700 hover:underline"
          >
            {selectedSite.domain}
          </a>
        </div>

        <section>
          <h2 className="text-xl font-bold">
            Today&apos;s Operations
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Approved Keywords"
              value={stats.keywords.approved}
              subtitle="Available for production"
              icon="🔑"
              color="purple"
            />

            <MetricCard
              title="Queued"
              value={stats.production.queued}
              subtitle="Waiting for worker"
              icon="⏳"
              color="orange"
            />

            <MetricCard
              title="Running"
              value={stats.production.running}
              subtitle="Currently processing"
              icon="⚙️"
              color="blue"
            />

            <MetricCard
              title="Failed"
              value={stats.production.failed}
              subtitle="Need attention"
              icon="⚠️"
              color="red"
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold">
            Editorial Pipeline
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Needs Review"
              value={stats.articles.reviewRequired}
              subtitle="WordPress drafts awaiting review"
              icon="👀"
              color="orange"
            />

            <MetricCard
              title="Ready to Publish"
              value={stats.articles.readyToPublish}
              subtitle="Editorially approved"
              icon="✅"
              color="green"
            />

            <MetricCard
              title="Published Today"
              value={stats.articles.publishedToday}
              subtitle="Live today"
              icon="🌐"
              color="blue"
            />

            <MetricCard
              title="Published Total"
              value={stats.articles.publishedTotal}
              subtitle="All live articles"
              icon="📚"
              color="purple"
            />
          </div>
        </section>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  Recent Production
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Latest queued, running, completed, and failed workflows.
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
              {stats.recentRuns.map((run: any) => (
                <Link
                  key={run.id}
                  href={`/production/runs/${run.id}`}
                  className="block rounded-xl border bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">
                        {run.article_title ||
                          run.keyword ||
                          "Production workflow"}
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        {friendlyStep(run.current_step)}
                      </div>
                    </div>

                    <StatusChip status={run.status} />
                  </div>

                  <div className="mt-4">
                    <ProgressBar
                      value={Number(
                        run.progress_percent ?? 0
                      )}
                    />
                  </div>

                  {run.error_message && (
                    <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {run.error_message}
                    </div>
                  )}
                </Link>
              ))}

              {stats.recentRuns.length === 0 && (
                <EmptyState
                  icon="⚙️"
                  title="No production activity"
                  description="Queue approved keywords to start production."
                />
              )}
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  Editorial Actions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Content currently requiring human attention.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <ActionCard
                href="/content/review"
                icon="👀"
                title="Editorial Review"
                count={stats.articles.reviewRequired}
                description="Review AI-generated WordPress drafts."
              />

              <ActionCard
                href="/content/publish"
                icon="🌐"
                title="Publish Queue"
                count={stats.articles.readyToPublish}
                description="Publish approved articles to the live website."
              />

              <ActionCard
                href="/production"
                icon="🚀"
                title="Production Center"
                count={stats.keywords.approved}
                description="Queue approved keywords for automated production."
              />
            </div>
          </Card>
        </div>

        <Card className="mt-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                Recently Published
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest articles published for the selected site.
              </p>
            </div>

            <Link
              href="/articles"
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              View articles
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {stats.recentPublished.map(
              (article: any) => (
                <div
                  key={article.id}
                  className="rounded-xl border bg-slate-50 p-4"
                >
                  <div className="font-semibold">
                    {article.title}
                  </div>

                  <div className="mt-2 text-xs text-slate-400">
                    Published:{" "}
                    {article.publish_date
                      ? new Date(
                          article.publish_date
                        ).toLocaleDateString()
                      : "—"}
                  </div>

                  {article.published_url && (
                    <a
                      href={article.published_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline"
                    >
                      Open live article
                    </a>
                  )}
                </div>
              )
            )}

            {stats.recentPublished.length === 0 && (
              <div className="md:col-span-2">
                <EmptyState
                  icon="📝"
                  title="No published articles"
                  description="Published content for this site will appear here."
                />
              </div>
            )}
          </div>
        </Card>
      </main>
    </AppShell>
  );
}

function ActionCard({
  href,
  icon,
  title,
  count,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  count: number;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50"
    >
      <div className="flex items-start gap-4">
        <div className="text-3xl">{icon}</div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="font-bold">{title}</div>

            <div className="rounded-full bg-white px-3 py-1 text-sm font-bold shadow-sm">
              {count}
            </div>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function friendlyStep(step: string | null) {
  const labels: Record<string, string> = {
    outline: "Generating outline",
    draft: "Generating article draft",
    featured_image: "Generating featured image",
    wordpress_draft: "Creating WordPress draft",
  };

  return step
    ? labels[step] || step.replaceAll("_", " ")
    : "Waiting";
}
