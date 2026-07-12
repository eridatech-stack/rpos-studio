import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getArticles } from "@/repositories/articleRepository";
import {
  Card,
  EmptyState,
  PageHeader,
  StatusChip,
} from "@/components/ui";

export default async function ArticlesPage() {
  const articles: any[] = await getArticles();

  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title="Articles"
          subtitle="Review article plans, drafts, WordPress content, and published articles."
        />

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
                        <Link
                          href={`/articles/${article.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Open Article
                        </Link>
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
                title="No articles yet"
                description="Queue approved keywords in the Production Center to generate your first articles."
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