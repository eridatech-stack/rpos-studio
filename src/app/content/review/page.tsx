import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ApproveArticleButton } from "@/components/ApproveArticleButton";
import { getReviewQueue } from "@/modules/editorial/repository";
import {
  isQualityReviewPassed,
  parseQualityReview,
} from "@/modules/editorial/qualityReview";
import {
  Card,
  EmptyState,
  MetricCard,
  PageHeader,
  StatusChip,
} from "@/components/ui";

export default async function ReviewQueuePage() {
  const articles = await getReviewQueue();
  const readyForDecision = articles.filter((article: any) =>
    isQualityReviewPassed(parseQualityReview(article.editor_notes))
  ).length;

  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title="Editorial Review"
          subtitle="Review AI-generated WordPress drafts before approving them for publication."
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            title="Waiting for Review"
            value={articles.length}
            subtitle="WordPress drafts requiring attention"
            icon="👀"
            color="orange"
          />

          <MetricCard
            title="With WordPress Draft"
            value={
              articles.filter(
                (article: any) => article.wordpress_draft_url
              ).length
            }
            subtitle="Available for WordPress preview"
            icon="📄"
            color="blue"
          />

          <MetricCard
            title="Ready for Decision"
            value={readyForDecision}
            subtitle="Quality checklist complete"
            icon="✅"
            color="green"
          />
        </section>

        <div className="mt-8 space-y-5">
          {articles.map((article: any) => {
            const qualityReviewPassed = isQualityReviewPassed(
              parseQualityReview(article.editor_notes)
            );

            return (
            <Card key={article.id}>
              <div className="flex flex-col justify-between gap-6 xl:flex-row">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusChip status={article.status} />

                    <span className="text-xs text-slate-400">
                      Updated:{" "}
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

                  <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
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
                      value={article.target_word_count}
                    />

                    <Info
                      label="Quality Review"
                      value={
                        qualityReviewPassed
                          ? "Complete"
                          : "Incomplete"
                      }
                    />
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-3 xl:max-w-sm xl:justify-end">
                  <Link
                    href={`/articles/${article.id}`}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Review in RPOS
                  </Link>

                  {article.wordpress_draft_url && (
                    <a
                      href={article.wordpress_draft_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Open WordPress
                    </a>
                  )}

                  <ApproveArticleButton
                    articleId={article.id}
                    disabled={!qualityReviewPassed}
                  />
                </div>
              </div>
            </Card>
          );
          })}

          {articles.length === 0 && (
            <Card>
              <EmptyState
                icon="🎉"
                title="Review queue is clear"
                description="New WordPress drafts will appear here after the production worker completes them."
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
