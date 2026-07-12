import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PublishApprovedArticleButton } from "@/components/PublishApprovedArticleButton";
import { getPublishingQueue } from "@/modules/editorial/repository";
import {
  Card,
  EmptyState,
  MetricCard,
  PageHeader,
  StatusChip,
} from "@/components/ui";

export default async function PublishQueuePage() {
  const articles = await getPublishingQueue();

  const articlesWithWordPressPost = articles.filter(
    (article: any) =>
      article.wordpress_post_id
  ).length;

  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title="Publish Queue"
          subtitle="Publish editorially approved articles to the live WordPress website."
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            title="Approved"
            value={articles.length}
            subtitle="Waiting for publication"
            icon="✅"
            color="green"
          />

          <MetricCard
            title="WordPress Ready"
            value={articlesWithWordPressPost}
            subtitle="Connected to a WordPress draft"
            icon="📄"
            color="blue"
          />

          <MetricCard
            title="Missing WordPress Post"
            value={
              articles.length -
              articlesWithWordPressPost
            }
            subtitle="Require WordPress draft creation"
            icon="⚠️"
            color="red"
          />
        </section>

        <div className="mt-8 space-y-5">
          {articles.map((article: any) => (
            <Card key={article.id}>
              <div className="flex flex-col justify-between gap-6 xl:flex-row">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusChip
                      status={article.status}
                    />

                    <span className="text-xs text-slate-400">
                      Approved:{" "}
                      {article.updated_at
                        ? new Date(
                            article.updated_at
                          ).toLocaleString()
                        : "—"}
                    </span>
                  </div>

                  <Link
                    href={`/articles/${article.id}`}
                    className="mt-3 block text-xl font-bold text-slate-900 hover:text-blue-700"
                  >
                    {article.title}
                  </Link>

                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                    <Info
                      label="Keyword"
                      value={article.keyword}
                    />

                    <Info
                      label="Category"
                      value={article.category}
                    />

                    <Info
                      label="Cluster"
                      value={article.cluster}
                    />

                    <Info
                      label="Target Words"
                      value={
                        article.target_word_count
                      }
                    />
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-3 xl:max-w-sm xl:justify-end">
                  <Link
                    href={`/articles/${article.id}`}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Review Article
                  </Link>

                  {article.wordpress_draft_url && (
                    <a
                      href={
                        article.wordpress_draft_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Preview WordPress
                    </a>
                  )}

                  {article.wordpress_post_id ? (
                    <PublishApprovedArticleButton
                      articleId={article.id}
                    />
                  ) : (
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      WordPress post ID missing
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {articles.length === 0 && (
            <Card>
              <EmptyState
                icon="🎉"
                title="Publish queue is clear"
                description="Articles approved in the Editorial Review queue will appear here."
              />
            </Card>
          )}
        </div>
      </main>
    </AppShell>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div>
      <div className="font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-slate-800">
        {value === null ||
        value === undefined ||
        value === ""
          ? "—"
          : String(value)}
      </div>
    </div>
  );
}