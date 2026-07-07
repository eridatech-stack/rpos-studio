import { AppShell } from "@/components/AppShell";
import { getPromptVersions } from "@/repositories/promptStudioRepository";
import { Card, EmptyState, PageHeader, StatusChip } from "@/components/ui";
import Link from "next/link";

export default async function PromptStudioPage() {
  const prompts = await getPromptVersions();

  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title="Prompt Studio"
          subtitle="View and manage AI prompts used by the RPOS production pipeline."
        />

        <Card>
          <div className="space-y-3">
            {prompts.map((prompt: any) => (
              <div
                key={prompt.id}
                className="rounded-xl border bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold">
                      <Link
                        href={`/ai/prompts/${prompt.id}`}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        {prompt.name}
                      </Link>
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Key: {prompt.prompt_key} · Model: {prompt.model} · Temp:{" "}
                      {prompt.temperature}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Version {prompt.version} · {prompt.site_name || "Global"}
                    </div>
                  </div>

                  <StatusChip status={prompt.active ? "completed" : "planned"} />
                </div>
              </div>
            ))}

            {prompts.length === 0 && (
              <EmptyState
                icon="🤖"
                title="No prompts yet"
                description="Add prompts to the prompt_versions table to power AI workflows."
              />
            )}
          </div>
        </Card>
      </main>
    </AppShell>
  );
}