import { Nav } from "@/components/Nav";
import { getArticleById } from "@/repositories/articleRepository";
import { GenerateDraftButton } from "@/components/GenerateDraftButton";

export default async function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article: any = await getArticleById(id);

  if (!article) {
    return (
      <>
        <Nav />
        <main className="p-8">
          <h1 className="text-2xl font-bold">Article not found</h1>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="p-8">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="text-sm uppercase text-slate-500">{article.status}</div>
          <h1 className="mt-2 text-3xl font-bold">{article.title}</h1>
          <p className="mt-2 text-slate-600">
            Keyword: {article.keywords?.keyword} · Category: {article.categories?.name} · Cluster: {article.topic_clusters?.name}
          </p>
        </div>
        <div className="mt-4">
          {article.status === "outline_ready" && (
            <GenerateDraftButton articleId={article.id} />
          )}
        </div>

        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">SEO</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-semibold text-slate-500">Slug</div>
              <div>{article.slug}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-500">Target Words</div>
              <div>{article.target_word_count}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-500">Meta Title</div>
              <div>{article.meta_title}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-500">Meta Description</div>
              <div>{article.meta_description}</div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Outline Sections</h2>

          <div className="mt-4 space-y-4">
            {article.article_sections.map((section: any) => (
              <div key={section.id} className="rounded-lg border p-4">
                <div className="text-sm text-slate-500">Section {section.section_order} · {section.status}</div>
                <h3 className="mt-1 text-lg font-semibold">{section.heading}</h3>
                <p className="mt-2 text-slate-600">{section.purpose}</p>
              </div>

            ))}
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">FAQs</h2>

          <div className="mt-4 space-y-4">
            {article.article_faqs.map((faq: any) => (
              <div key={faq.id} className="rounded-lg border p-4">
                <div className="text-sm text-slate-500">FAQ {faq.faq_order} · {faq.status}</div>
                <h3 className="mt-1 text-lg font-semibold">{faq.question}</h3>
                <p className="mt-2 text-slate-600">{faq.answer_goal}</p>
              </div>
            ))}
          </div>
        </section>

        {article.draft_markdown && (
        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Draft Markdown</h2>
          <pre className="mt-4 max-h-[700px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm">
            {article.draft_markdown}
          </pre>
        </section>
      )}
      </main>
    </>
  );
}