import { AppShell } from "@/components/AppShell";
import { getPromptVersionById } from "@/repositories/promptStudioRepository";
import { Card, PageHeader, StatusChip } from "@/components/ui";
import { PromptEditor } from "@/components/PromptEditor";

export default async function PromptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prompt = await getPromptVersionById(id);

  if (!prompt) {
    return (
      <AppShell>
        <main className="p-8">
          <PageHeader title="Prompt not found" />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title={prompt.name}
          subtitle={`Key: ${prompt.prompt_key} · Version ${prompt.version}`}
        />

        <Card>
          <div className="grid gap-4 md:grid-cols-4">
            <Info label="Model" value={prompt.model} />
            <Info label="Temperature" value={prompt.temperature} />
            <Info label="Output Format" value={prompt.output_format} />
            <div>
              <div className="text-sm font-semibold text-slate-500">Status</div>
              <div className="mt-1">
                <StatusChip status={prompt.active ? "completed" : "planned"} />
              </div>
            </div>
          </div>
        </Card>

        <Card className="mt-6">
        <h2 className="text-xl font-bold">Edit Prompt</h2>

        <div className="mt-4">
            <PromptEditor prompt={prompt} />
        </div>
        </Card>
      </main>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-1 font-medium">{value ?? "—"}</div>
    </div>
  );
}