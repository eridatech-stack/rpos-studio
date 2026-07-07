import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/keywords", label: "Keywords", icon: "🔑" },
  { href: "/articles", label: "Articles", icon: "📝" },
  { href: "/dashboard", label: "Production", icon: "⚙️" },
  { href: "/dashboard", label: "AI", icon: "🤖" },
  { href: "/dashboard", label: "Publishing", icon: "📤" },
  { href: "/dashboard", label: "Analytics", icon: "📈" },
  { href: "/dashboard", label: "Revenue", icon: "💰" },
  { href: "/dashboard", label: "Settings", icon: "⚙️" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed left-0 top-0 h-screen w-72 border-r bg-slate-950 text-white">
        <div className="border-b border-slate-800 p-6">
          <div className="text-2xl font-black">RPOS Studio</div>
          <div className="mt-1 text-sm text-slate-400">AI Publishing OS</div>
        </div>

        <nav className="space-y-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="ml-72">
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