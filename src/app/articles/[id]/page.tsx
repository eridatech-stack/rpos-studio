import { AppShell } from "@/components/AppShell";
import { GenerateDraftButton } from "@/components/GenerateDraftButton";
import { PublishWordPressButton } from "@/components/PublishWordPressButton";
import { getArticleById } from "@/repositories/articleRepository";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { DraftEditor } from "@/components/DraftEditor";

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article: any = await getArticleById(id);

  if (!article) {
    return (
      <>
        <main className="p-8">
          <h1 className="text-2xl font-bold">Article not found</h1>
        </main>
      </>
    );
  }

  return (
    <AppShell>
      <main className="p-8">
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="text-sm uppercase text-slate-500">
            {article.status}
          </div>

          <h1 className="mt-2 text-3xl font-bold">{article.title}</h1>

          <p className="mt-2 text-slate-600">
            Keyword: {article.keywords?.keyword} · Category:{" "}
            {article.categories?.name} · Cluster:{" "}
            {article.topic_clusters?.name}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {article.status === "outline_ready" && (
              <GenerateDraftButton articleId={article.id} />
            )}

            {article.status === "draft_ready" && (
              <PublishWordPressButton articleId={article.id} />
            )}
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Article Information</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Info label="Slug" value={article.slug} />
            <Info label="Article Type" value={article.article_type} />
            <Info label="Search Intent" value={article.intent} />
            <Info label="Target Words" value={article.target_word_count} />
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">SEO</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Info label="Meta Title" value={article.meta_title} />
            <Info label="Meta Description" value={article.meta_description} />
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Publishing</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Info label="WordPress Post ID" value={article.wordpress_post_id} />

            <div>
              <div className="text-sm font-semibold text-slate-500">
                WordPress Draft
              </div>

              {article.wordpress_draft_url ? (
                <a
                  href={article.wordpress_draft_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline"
                >
                  Open WordPress Draft
                </a>
              ) : (
                <div className="text-slate-400">Not created yet</div>
              )}
            </div>

            <Info label="Published URL" value={article.published_url} />
            <Info label="Publish Date" value={article.publish_date} />
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Outline Sections</h2>

          <div className="mt-4 space-y-4">
            {article.article_sections?.map((section: any) => (
              <div key={section.id} className="rounded-lg border p-4">
                <div className="text-sm text-slate-500">
                  Section {section.section_order} · {section.status}
                </div>

                <h3 className="mt-1 text-lg font-semibold">
                  {section.heading}
                </h3>

                <p className="mt-2 text-slate-600">{section.purpose}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">FAQs</h2>

          <div className="mt-4 space-y-4">
            {article.article_faqs?.map((faq: any) => (
              <div key={faq.id} className="rounded-lg border p-4">
                <div className="text-sm text-slate-500">
                  FAQ {faq.faq_order} · {faq.status}
                </div>

                <h3 className="mt-1 text-lg font-semibold">
                  {faq.question}
                </h3>

                <p className="mt-2 text-slate-600">{faq.answer_goal}</p>
              </div>
            ))}
          </div>
        </section>

        {article.draft_markdown && (
          <DraftEditor
            articleId={article.id}
            initialMarkdown={article.draft_markdown}
          />
        )}
                
      </main>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div>{value || <span className="text-slate-400">—</span>}</div>
    </div>
  );
}