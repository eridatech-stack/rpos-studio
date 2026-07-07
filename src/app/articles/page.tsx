import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getArticles } from "@/repositories/articleRepository";

export default async function ArticlesPage() {
  const articles: any = await getArticles();

  return (
    <AppShell>
      <main className="p-8">
        <h1 className="text-3xl font-bold">Articles</h1>
        <p className="mt-2 text-slate-600">
          Article plans and drafts generated from approved keywords.
        </p>

        <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Keyword</th>
                <th className="p-3">Category</th>
                <th className="p-3">Cluster</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
                <th className="p-3">Words</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((item: any) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">
                    <Link className="text-blue-700 hover:underline" href={`/articles/${item.id}`}>
                      {item.title}
                    </Link>
                  </td>
                  <td className="p-3">{item.keywords?.keyword}</td>
                  <td className="p-3">{item.categories?.name}</td>
                  <td className="p-3">{item.topic_clusters?.name}</td>
                  <td className="p-3">{item.article_type}</td>
                  <td className="p-3">{item.status}</td>
                  <td className="p-3">{item.target_word_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </AppShell>
  );
}
