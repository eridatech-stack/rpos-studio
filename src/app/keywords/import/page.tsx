import { AppShell } from "@/components/AppShell";
import { KeywordCsvImporter } from "@/components/KeywordCsvImporter";
import {
  Card,
  PageHeader,
} from "@/components/ui";

export default function KeywordImportPage() {
  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title="Keyword Import"
          subtitle="Import keyword opportunities from CSV and prepare them for bulk production."
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Card>
            <h2 className="text-xl font-bold">
              Upload CSV
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Existing keywords are updated
              instead of duplicated.
            </p>

            <div className="mt-6">
              <KeywordCsvImporter />
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold">
              Supported columns
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <Field
                name="keyword"
                required
                description="Primary keyword."
              />

              <Field
                name="category_slug"
                description="Example: ai"
              />

              <Field
                name="cluster_slug"
                description="Example: ai-tools"
              />

              <Field
                name="intent"
                description="informational, commercial, transactional, or navigational"
              />

              <Field
                name="article_type"
                description="cluster, pillar, how_to, comparison, review, faq, or news"
              />

              <Field
                name="search_volume"
              />

              <Field name="difficulty" />

              <Field name="cpc" />

              <Field name="opportunity_score" />

              <Field
                name="priority"
                description="high, medium, or low"
              />

              <Field
                name="status"
                description="Optional; overrides the selected default."
              />

              <Field name="notes" />
            </div>
          </Card>
        </div>

        <Card className="mt-6">
          <h2 className="text-xl font-bold">
            CSV example
          </h2>

          <pre className="mt-4 overflow-auto rounded-xl bg-slate-950 p-5 text-sm text-slate-100">
{`keyword,category_slug,cluster_slug,intent,article_type,search_volume,difficulty,opportunity_score,priority
best ai tools for students,ai,ai-tools,commercial,comparison,4200,28,91,high
how to write better chatgpt prompts,ai,prompt-engineering,informational,how_to,3100,19,94,high`}
          </pre>
        </Card>
      </main>
    </AppShell>
  );
}

function Field({
  name,
  description,
  required = false,
}: {
  name: string;
  description?: string;
  required?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <div className="font-mono font-semibold text-slate-800">
        {name}
        {required && (
          <span className="ml-2 text-red-600">
            required
          </span>
        )}
      </div>

      {description && (
        <div className="mt-1 text-slate-500">
          {description}
        </div>
      )}
    </div>
  );
}