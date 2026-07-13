import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { KeywordEditForm } from "@/components/KeywordEditForm";
import {
  getKeywordById,
  getKeywordEditOptions,
} from "@/repositories/keywordRepository";
import {
  Card,
  EmptyState,
  PageHeader,
  StatusChip,
} from "@/components/ui";

export default async function EditKeywordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const keyword = await getKeywordById(id);

  if (!keyword) {
    return (
      <AppShell>
        <main className="p-8">
          <PageHeader
            title="Keyword not found"
            subtitle="The requested keyword does not exist."
          />

          <Card>
            <EmptyState
              icon="🔑"
              title="Keyword not found"
              description="Return to the Keyword Library and select another keyword."
            />
          </Card>
        </main>
      </AppShell>
    );
  }

  const options = await getKeywordEditOptions(
    keyword.site_id
  );

  return (
    <AppShell>
      <main className="p-8">
        <div className="mb-6 text-sm text-slate-500">
          <Link
            href="/keywords"
            className="font-medium text-blue-700 hover:underline"
          >
            Keyword Library
          </Link>

          <span className="mx-2">/</span>
          <span>Edit</span>
        </div>

        <PageHeader
          title="Edit Keyword"
          subtitle={keyword.keyword}
          actions={
            <StatusChip status={keyword.status} />
          }
        />

        <Card>
          <KeywordEditForm
            keyword={{
              id: keyword.id,
              keyword: keyword.keyword,
              category_id: keyword.category_id,
              cluster_id: keyword.cluster_id,
              intent: keyword.intent,
              article_type: keyword.article_type,
              priority: keyword.priority,
              opportunity_score:
                keyword.opportunity_score,
              search_volume:
                keyword.search_volume,
              difficulty: keyword.difficulty,
              status: keyword.status,
              notes: keyword.notes,
            }}
            categories={options.categories}
            clusters={options.clusters}
          />
        </Card>
      </main>
    </AppShell>
  );
}