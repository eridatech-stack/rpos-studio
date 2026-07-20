import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ApproveArticleButton } from "@/components/ApproveArticleButton";
import { AutomatedReviewCard } from "@/components/AutomatedReviewCard";
import { DraftEditor } from "@/components/DraftEditor";
import { GenerateDraftButton } from "@/components/GenerateDraftButton";
import { GenerateFeaturedImageButton } from "@/components/GenerateFeaturedImageButton";
import { PublishApprovedArticleButton } from "@/components/PublishApprovedArticleButton";
import { PublishWordPressButton } from "@/components/PublishWordPressButton";
import { QualityReviewChecklist } from "@/components/QualityReviewChecklist";
import { UpdateWordPressDraftButton } from "@/components/UpdateWordPressDraftButton";
import {
  isQualityReviewPassed,
  parseQualityReview,
} from "@/modules/editorial/qualityReview";
import { parseAutomatedReview } from "@/modules/editorial/automatedReview";
import { getArticleById } from "@/repositories/articleRepository";
import {
  Card,
  EmptyState,
  PageHeader,
  StatusChip,
} from "@/components/ui";

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article: any = await getArticleById(id);

  if (!article) {
    return (
      <AppShell>
        <main className="p-8">
          <PageHeader
            title="Article not found"
            subtitle="The requested article does not exist or may have been removed."
          />

          <Card>
            <EmptyState
              icon="📝"
              title="Article not found"
              description="Return to the Articles page and select another article."
            />
          </Card>
        </main>
      </AppShell>
    );
  }

  const qualityReview = parseQualityReview(article.editor_notes);
  const qualityReviewPassed = isQualityReviewPassed(qualityReview);
  const automatedReview = parseAutomatedReview(article.editor_notes);

  return (
    <AppShell>
      <main className="p-8">
        <div className="mb-6 text-sm text-slate-500">
          <Link
            href="/articles"
            className="font-medium text-blue-700 hover:underline"
          >
            Articles
          </Link>

          <span className="mx-2">/</span>
          <span>{article.title}</span>
        </div>

        <PageHeader
          title={article.title}
          subtitle={buildSubtitle(article)}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip status={article.status} />
              <ArticleActions
                article={article}
                qualityReviewPassed={qualityReviewPassed}
              />
            </div>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            {article.draft_markdown ? (
              <DraftEditor
                articleId={article.id}
                initialMarkdown={article.draft_markdown}
              />
            ) : (
              <Card>
                <EmptyState
                  icon="📝"
                  title="No draft generated"
                  description="The article does not currently contain Markdown draft content."
                />
              </Card>
            )}

            <Card>
              <h2 className="text-xl font-bold">Outline Sections</h2>

              <div className="mt-5 space-y-4">
                {article.article_sections?.map((section: any) => (
                  <div
                    key={section.id}
                    className="rounded-xl border bg-slate-50 p-4"
                  >
                    <div className="text-sm text-slate-500">
                      Section {section.section_order} ·{" "}
                      {friendlyValue(section.status)}
                    </div>

                    <h3 className="mt-1 text-lg font-semibold">
                      {section.heading}
                    </h3>

                    {section.purpose && (
                      <p className="mt-2 text-slate-600">
                        {section.purpose}
                      </p>
                    )}

                    <div className="mt-2 text-xs text-slate-400">
                      Target words: {section.target_words ?? "—"}
                    </div>
                  </div>
                ))}

                {!article.article_sections?.length && (
                  <EmptyState
                    icon="🧩"
                    title="No outline sections"
                    description="Outline sections have not been saved for this article."
                  />
                )}
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-bold">FAQs</h2>

              <div className="mt-5 space-y-4">
                {article.article_faqs?.map((faq: any) => (
                  <div
                    key={faq.id}
                    className="rounded-xl border bg-slate-50 p-4"
                  >
                    <div className="text-sm text-slate-500">
                      FAQ {faq.faq_order} · {friendlyValue(faq.status)}
                    </div>

                    <h3 className="mt-1 text-lg font-semibold">
                      {faq.question}
                    </h3>

                    {faq.answer_goal && (
                      <p className="mt-2 text-slate-600">
                        {faq.answer_goal}
                      </p>
                    )}
                  </div>
                ))}

                {!article.article_faqs?.length && (
                  <EmptyState
                    icon="❓"
                    title="No FAQs"
                    description="No FAQ entries have been created for this article."
                  />
                )}
              </div>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card>
              <h2 className="text-xl font-bold">Article Information</h2>

              <div className="mt-5 space-y-4">
                <Info label="Slug" value={article.slug} />
                <Info
                  label="Article Type"
                  value={friendlyValue(article.article_type)}
                />
                <Info
                  label="Search Intent"
                  value={friendlyValue(article.intent)}
                />
                <Info
                  label="Target Words"
                  value={article.target_word_count}
                />
                <Info
                  label="Keyword"
                  value={article.keywords?.keyword}
                />
                <Info
                  label="Category"
                  value={article.categories?.name}
                />
                <Info
                  label="Cluster"
                  value={article.topic_clusters?.name}
                />
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-bold">SEO</h2>

              <div className="mt-5 space-y-4">
                <Info
                  label="Meta Title"
                  value={article.meta_title}
                />

                <Info
                  label="Meta Description"
                  value={article.meta_description}
                />
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-bold">Publishing</h2>

              <div className="mt-5 space-y-4">
                <Info
                  label="WordPress Post ID"
                  value={article.wordpress_post_id}
                />

                <ExternalLinkInfo
                  label="WordPress Draft"
                  href={article.wordpress_draft_url}
                  emptyText="Not created yet"
                  linkText="Open WordPress Draft"
                />

                <ExternalLinkInfo
                  label="Published Article"
                  href={article.published_url}
                  emptyText="Not published yet"
                  linkText="Open Live Article"
                />

                <Info
                  label="Publish Date"
                  value={formatDate(article.publish_date)}
                />
              </div>
            </Card>

            {(article.status === "wordpress_draft" ||
              article.status === "human_review" ||
              article.status === "approved") && (
              <>
                <Card>
                  <AutomatedReviewCard
                    articleId={article.id}
                    review={automatedReview}
                  />
                </Card>

                <Card>
                  <QualityReviewChecklist
                    articleId={article.id}
                    initialReview={qualityReview}
                  />
                </Card>
              </>
            )}

            <FeaturedImageCard article={article} />
          </aside>
        </div>
      </main>
    </AppShell>
  );
}

function ArticleActions({
  article,
  qualityReviewPassed,
}: {
  article: any;
  qualityReviewPassed: boolean;
}) {
  if (article.status === "outline_ready") {
    return (
      <GenerateDraftButton articleId={article.id} />
    );
  }

  if (article.status === "draft_ready") {
    return (
      <>
        <GenerateDraftButton articleId={article.id} regenerate />
        <PublishWordPressButton articleId={article.id} />
      </>
    );
  }

  if (
    article.status === "wordpress_draft" ||
    article.status === "human_review"
  ) {
    return (
      <>
        {article.wordpress_post_id && (
          <>
            <GenerateDraftButton articleId={article.id} regenerate />
            <UpdateWordPressDraftButton articleId={article.id} />
            <GenerateFeaturedImageButton articleId={article.id} />
          </>
        )}

        <ApproveArticleButton
          articleId={article.id}
          disabled={!qualityReviewPassed}
        />
      </>
    );
  }

  if (article.status === "approved") {
    return (
      <>
        {article.wordpress_post_id && (
          <>
            <GenerateDraftButton articleId={article.id} regenerate />
            <UpdateWordPressDraftButton articleId={article.id} />
            <GenerateFeaturedImageButton articleId={article.id} />
          </>
        )}

        <PublishApprovedArticleButton
          articleId={article.id}
        />
      </>
    );
  }

  if (article.status === "published") {
    return (
      <>
        <GenerateDraftButton
          articleId={article.id}
          regenerate
          published
        />
        <UpdateWordPressDraftButton
          articleId={article.id}
          published
        />
        {article.wordpress_post_id && (
          <GenerateFeaturedImageButton articleId={article.id} />
        )}
        {article.published_url ? (
          <a
            href={article.published_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-green-600 px-5 py-2.5 font-semibold text-white transition hover:bg-green-700"
          >
            🌐 Open Live Article
          </a>
        ) : null}
      </>
    );
  }

  return null;
}

function FeaturedImageCard({
  article,
}: {
  article: any;
}) {
  const featuredImages =
    article.images?.filter(
      (image: any) => image.type === "featured"
    ) ?? [];

  const featuredImage = featuredImages.find(
    (image: any) =>
      image.status === "uploaded" ||
      image.status === "generated" ||
      image.status === "approved"
  ) ||
    featuredImages[0];

  const previousImages = featuredImages.filter(
    (image: any) => image.type === "featured"
      && image.id !== featuredImage?.id
  );

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Featured Image</h2>

          <p className="mt-1 text-sm text-slate-500">
            WordPress media and local generation status.
          </p>
        </div>

        {article.wordpress_post_id &&
          article.status !== "published" && (
            <GenerateFeaturedImageButton articleId={article.id} />
          )}
      </div>

      {featuredImage ? (
        <div className="mt-5 space-y-4">
          {featuredImage.file_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featuredImage.file_url}
              alt={featuredImage.alt_text || article.title}
              className="aspect-[3/2] w-full rounded-xl border object-cover"
            />
          )}

          <div className="space-y-3 text-sm">
            <Info
              label="Status"
              value={friendlyValue(featuredImage.status)}
            />
            <Info
              label="WordPress Media ID"
              value={featuredImage.wordpress_media_id}
            />
            <Info
              label="Generated Image Size"
              value={formatFileSize(featuredImage.file_size_bytes)}
            />
            <Info
              label="Alt Text"
              value={featuredImage.alt_text}
            />
          </div>

          {previousImages.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-bold text-slate-700">
                Image History
              </h3>

              <div className="mt-3 space-y-2">
                {previousImages.map((image: any) => (
                  <div
                    key={image.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 p-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-700">
                        {friendlyValue(image.status)}
                      </div>

                      <div className="mt-1 text-slate-400">
                        {image.created_at
                          ? new Date(image.created_at).toLocaleString()
                          : "—"}
                      </div>
                    </div>

                    <div className="text-right font-mono text-slate-500">
                      {image.wordpress_media_id && (
                        <div>
                          WP {String(image.wordpress_media_id)}
                        </div>
                      )}
                      <div>
                        {formatFileSize(image.file_size_bytes) || "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            icon="🖼️"
            title="No featured image"
            description="Generate an image after the WordPress draft exists."
          />
        </div>
      )}
    </Card>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  const hasValue =
    value !== null &&
    value !== undefined &&
    value !== "";

  return (
    <div>
      <div className="text-sm font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 break-words text-slate-800">
        {hasValue ? String(value) : "—"}
      </div>
    </div>
  );
}

function ExternalLinkInfo({
  label,
  href,
  linkText,
  emptyText,
}: {
  label: string;
  href?: string | null;
  linkText: string;
  emptyText: string;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-slate-500">
        {label}
      </div>

      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block break-all font-medium text-blue-700 hover:underline"
        >
          {linkText}
        </a>
      ) : (
        <div className="mt-1 text-slate-400">
          {emptyText}
        </div>
      )}
    </div>
  );
}

function buildSubtitle(article: any) {
  const parts = [
    article.keywords?.keyword
      ? `Keyword: ${article.keywords.keyword}`
      : null,
    article.categories?.name
      ? `Category: ${article.categories.name}`
      : null,
    article.topic_clusters?.name
      ? `Cluster: ${article.topic_clusters.name}`
      : null,
  ].filter(Boolean);

  return parts.join(" · ");
}

function friendlyValue(
  value: string | null | undefined
) {
  return value
    ? value.replaceAll("_", " ")
    : "—";
}

function formatDate(value: unknown) {
  if (!value) {
    return "—";
  }

  const date = new Date(String(value));

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString();
}

function formatFileSize(value: unknown) {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes < 0) {
    return null;
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}
