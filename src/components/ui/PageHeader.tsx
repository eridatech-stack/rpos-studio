export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-6">
      <div>
        <h1 className="text-4xl font-black">{title}</h1>
        {subtitle && <p className="mt-2 text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}