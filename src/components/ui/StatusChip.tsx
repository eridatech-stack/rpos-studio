const colors: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  planned: "bg-slate-100 text-slate-700",
  outline_ready: "bg-purple-100 text-purple-700",
  draft_ready: "bg-blue-100 text-blue-700",
  wordpress_draft: "bg-orange-100 text-orange-700",
  published: "bg-green-100 text-green-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[status] ?? "bg-slate-100 text-slate-700"}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}