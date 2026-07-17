import Link from "next/link";

const navSections = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    ],
  },
  {
    label: "Keywords",
    items: [
      { href: "/keywords", label: "Library", icon: "🔑" },
      { href: "/keywords/import", label: "Import", icon: "📥" },
      { href: "/keywords/generator", label: "Generator", icon: "🧭" },
      { href: "/keywords/packs", label: "Packs", icon: "📦" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/articles", label: "Articles", icon: "📝" },
      { href: "/content/review", label: "Review Queue", icon: "👀" },
      { href: "/content/publish", label: "Publish Queue", icon: "🌐" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/production", label: "Production", icon: "⚙️" },
      { href: "/production/jobs", label: "Jobs", icon: "📋" },
      { href: "/production/runs", label: "Runs", icon: "🏃" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/ai/prompts", label: "Prompt Studio", icon: "🤖" },
      { href: "/developer-tools", label: "Developer Tools", icon: "🛠️" },
    ],
  },
  {
    label: "Coming Soon",
    items: [
      { href: "/dashboard", label: "Publishing", icon: "📤" },
      { href: "/dashboard", label: "Analytics", icon: "📈" },
      { href: "/dashboard", label: "Revenue", icon: "💰" },
      { href: "/dashboard", label: "Settings", icon: "⚙️" },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r bg-slate-950 text-white xl:w-72">
        <div className="shrink-0 border-b border-slate-800 px-5 py-5 xl:p-6">
          <div className="text-xl font-black xl:text-2xl">RPOS Studio</div>
          <div className="mt-1 text-sm text-slate-400">AI Publishing OS</div>
        </div>

        <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navSections.map((section) => (
            <div key={section.label}>
              <div className="px-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                {section.label}
              </div>

              <div className="mt-2 space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={`${section.label}-${item.label}`}
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    <span className="w-5 shrink-0 text-center text-base">
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="ml-64 xl:ml-72">
        <header className="sticky top-0 z-10 border-b bg-white/90 px-8 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Workspace</div>
              <div className="font-semibold">rithm.info</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                OpenAI Connected
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                Local Dev
              </div>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
