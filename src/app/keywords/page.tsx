import { Nav } from "@/components/Nav";
import { GenerateButton } from "@/components/GenerateButton";
import { getKeywords } from "@/repositories/keywordRepository";

export default async function KeywordsPage() {
  const keywords: any = await getKeywords();

  return (
    <>
      <Nav />
      <main className="p-8">
        <h1 className="text-3xl font-bold">Keyword Library</h1>
        <p className="mt-2 text-slate-600">
          Approved keyword opportunities from the RPOS database.
        </p>

        <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3">Keyword</th>
                <th className="p-3">Category</th>
                <th className="p-3">Cluster</th>
                <th className="p-3">Intent</th>
                <th className="p-3">Type</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Score</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((item: any) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.keyword}</td>
                  <td className="p-3">{item.categories?.name}</td>
                  <td className="p-3">{item.topic_clusters?.name}</td>
                  <td className="p-3">{item.intent}</td>
                  <td className="p-3">{item.article_type}</td>
                  <td className="p-3">{item.priority}</td>
                  <td className="p-3">{item.opportunity_score}</td>
                  <td className="p-3">{item.status}</td>
                  <td className="p-3">
                    {item.status === "approved" ? (
                      <GenerateButton keywordId={item.id} />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
