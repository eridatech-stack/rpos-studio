export function EmptyState({
  icon = "📭",
  title,
  description,
}: {
  icon?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="mt-3 font-bold text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}