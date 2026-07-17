import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { KeywordPackGeneratorForm } from "@/components/KeywordPackGeneratorForm";
import { getSites } from "@/repositories/dashboardRepository";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export default async function KeywordPackGeneratorPage() {
  const sites = await getSites();

  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title="Keyword Pack Generator"
          subtitle="Create structured keyword architectures for categories, clusters, pillar articles, and supporting content."
          actions={
            <Link
              href="/keywords/packs"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              View Packs
            </Link>
          }
        />

        <Card>
          {sites.length > 0 ? (
            <KeywordPackGeneratorForm sites={sites} />
          ) : (
            <EmptyState
              icon="🔑"
              title="No active sites"
              description="Create an active site before generating keyword packs."
            />
          )}
        </Card>
      </main>
    </AppShell>
  );
}
