import { Nav } from "@/components/Nav";
import { db } from "@/lib/db";

async function getStats() {
  const [[sites]]: any = await db.query("SELECT COUNT(*) as count FROM sites");
  const [[keywords]]: any = await db.query("SELECT COUNT(*) as count FROM keywords");
  const [[articles]]: any = await db.query("SELECT COUNT(*) as count FROM articles");
  const [[published]]: any = await db.query("SELECT COUNT(*) as count FROM articles WHERE status = 'published'");

  return {
    sites: sites.count,
    keywords: keywords.count,
    articles: articles.count,
    published: published.count,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <>
      <Nav />
      <main className="p-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          {Object.entries(stats).map(([label, value]) => (
            <div key={label} className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="text-sm uppercase text-slate-500">{label}</div>
              <div className="mt-2 text-3xl font-bold">{value}</div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
