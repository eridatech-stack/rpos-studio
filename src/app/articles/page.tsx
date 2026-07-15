import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DeleteArticleButton } from "@/components/DeleteArticleButton";
import { getArticles } from "@/repositories/articleRepository";
import {
  Card,
  EmptyState,
  PageHeader,
  StatusChip,
} from "@/components/ui";

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() || "";
  const articles: any[] = await getArticles({
    query,
  });

  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title="Articles"
          subtitle="Review article plans, drafts, WordPress content, and published articles."
        />

        <Card className="mb-6">
          <form
            action="/articles"
            className="flex flex-col gap-3 md:flex-row md:items-end"
          >
            <label className="flex-1">
              <span className="text-sm font-semibold text-slate-500">
                Search articles
              </span>

              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search title, keyword, category, status, SEO text..."
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700"
              >
                Search
              </button>

              {query && (
                <Link
                  href="/articles"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Clear
                </Link>
              )}
            </div>
          </form>

          {query && (
            <div className="mt-3 text-sm text-slate-500">
              Showing {articles.length} result
              {articles.length === 1 ? "" : "s"} for{" "}
              <span className="font-semibold text-slate-700">
                {query}
              </span>
            </div>
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          {articles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-4">Title</th>
                    <th className="p-4">Keyword</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Cluster</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Words</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {articles.map((article: any) => (
                    <tr
                      key={article.id}
                      className="border-t transition hover:bg-slate-50"
                    >
                      <td className="max-w-sm p-4">
                        <Link
                          href={`/articles/${article.id}`}
                          className="font-semibold text-blue-700 hover:underline"
                        >
                          {article.title}
                        </Link>
                      </td>

                      <td className="p-4">
                        {article.keywords?.keyword || "—"}
                      </td>

                      <td className="p-4">
                        {article.categories?.name || "—"}
                      </td>

                      <td className="p-4">
                        {article.topic_clusters?.name || "—"}
                      </td>

                      <td className="p-4">
                        {friendlyValue(article.article_type)}
                      </td>

                      <td className="p-4">
                        <StatusChip status={article.status} />
                      </td>

                      <td className="p-4">
                        {article.target_word_count ?? "—"}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/articles/${article.id}`}
                            title="Open Article"
                            aria-label={`Open article ${article.title}`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg transition hover:bg-slate-100"
                          >
                            📄
                          </Link>

                          {article.status !== "published" && (
                            <DeleteArticleButton
                              articleId={article.id}
                              title={article.title}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                icon="📝"
                title={query ? "No matching articles" : "No articles yet"}
                description={
                  query
                    ? "Try a different title, keyword, category, status, or SEO search."
                    : "Queue approved keywords in the Production Center to generate your first articles."
                }
              />
            </div>
          )}
        </Card>
      </main>
    </AppShell>
  );
}

function friendlyValue(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "—";
}
