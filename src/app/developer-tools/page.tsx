import { AppShell } from "@/components/AppShell";
import { SeedKeywordsButton } from "@/components/SeedKeywordsButton";
import { Card, PageHeader } from "@/components/ui";

export default function DeveloperToolsPage() {
  return (
    <AppShell>
      <main className="p-8">
        <PageHeader
          title="Developer Tools"
          subtitle="Generate controlled development data for testing RPOS workflows."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="text-3xl">🌱</div>
            <h2 className="mt-4 text-xl font-bold">
              Seed Approved Keywords
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Adds or refreshes realistic approved keyword opportunities
              across AI, technology, cybersecurity, and productivity.
            </p>

            <div className="mt-5">
              <SeedKeywordsButton />
            </div>
          </Card>

          <Card>
            <div className="text-3xl">🛡️</div>
            <h2 className="mt-4 text-xl font-bold">
              Safe Development Mode
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Seeder endpoints are blocked when the application runs in
              production mode.
            </p>
          </Card>
        </div>
      </main>
    </AppShell>
  );
}