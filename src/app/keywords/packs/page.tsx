import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AutoRefresh } from "@/components/AutoRefresh";
import { listKeywordPacks } from "@/modules/keyword-packs/repository";
import {
  Card,
  EmptyState,
  MetricCard,
  PageHeader,
  StatusChip,
} from "@/components/ui";
import { ProgressBar } from "@/shared/ui";

export default async function KeywordPacksPage() {
  const packs = await listKeywordPacks();

  const summary = {
    total: packs.length,
    active: packs.filter((pack: any) =>
      ["queued", "running"].includes(pack.status)
    ).length,
    ready: packs.filter((pack: any) => pack.status === "ready_for_review")
      .length,
    completed: packs.filter((pack: any) => pack.status === "completed")
      .length,
  };

  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title="Keyword Packs"
          subtitle="Review generated keyword architectures before importing them into the live keyword library."
          actions={
            <div className="flex flex-wrap gap-3">
              <AutoRefresh />
              <Link
                href="/keywords/generator"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700"
              >
                New Pack
              </Link>
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Total Packs"
            value={summary.total}
            subtitle="Created packs"
            icon="🧭"
          />
          <MetricCard
            title="Active"
            value={summary.active}
            subtitle="Queued or running"
            icon="⚙️"
            color="blue"
          />
          <MetricCard
            title="Ready"
            value={summary.ready}
            subtitle="Awaiting review"
            icon="👀"
            color="orange"
          />
          <MetricCard
            title="Completed"
            value={summary.completed}
            subtitle="Imported packs"
            icon="✅"
            color="green"
          />
        </section>

        <Card className="mt-8 overflow-hidden p-0">
          {packs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-4">Pack</th>
                    <th className="p-4">Site</th>
                    <th className="p-4">Requested</th>
                    <th className="p-4">Generated</th>
                    <th className="p-4">Approved</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Progress</th>
                    <th className="p-4">Created</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {packs.map((pack: any) => (
                    <tr key={pack.id} className="border-t hover:bg-slate-50">
                      <td className="max-w-xs p-4">
                        <div className="font-semibold text-slate-900">
                          {pack.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {pack.niche}
                        </div>
                      </td>
                      <td className="p-4">{pack.site_name}</td>
                      <td className="p-4">{pack.requested_keyword_count}</td>
                      <td className="p-4">{Number(pack.item_count ?? 0)}</td>
                      <td className="p-4">
                        {Number(pack.approved_item_count ?? 0)}
                      </td>
                      <td className="p-4">
                        <StatusChip status={pack.status} />
                      </td>
                      <td className="w-56 p-4">
                        <ProgressBar
                          value={Number(pack.progress_percent ?? 0)}
                          label={friendlyStep(pack.current_step, pack.status)}
                        />
                      </td>
                      <td className="p-4 text-slate-500">
                        {pack.created_at
                          ? new Date(pack.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/keywords/packs/${pack.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8">
              <EmptyState
                icon="🧭"
                title="No keyword packs yet"
                description="Create a keyword pack to generate a structured topic architecture."
              />
            </div>
          )}
        </Card>
      </main>
    </AppShell>
  );
}

function friendlyStep(step: string | null, status: string | null) {
  if (!step) {
    return status === "queued" ? "Waiting for worker" : status || "-";
  }

  return step.replaceAll("_", " ");
}
