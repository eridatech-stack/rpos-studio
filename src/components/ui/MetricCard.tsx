type Color = "blue" | "green" | "purple" | "orange" | "red";

const colors: Record<Color, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  red: "bg-red-50 text-red-700 border-red-200",
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color = "blue",
}: {
  title: string;
  value: number | string | null;
  subtitle: string;
  icon: string;
  color?: Color;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-start gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </div>
          <div className="mt-3 break-words text-[clamp(1.85rem,2.6vw,2.25rem)] font-black leading-tight">
            {value ?? 0}
          </div>
          <div className="mt-3 text-sm text-slate-500">{subtitle}</div>
        </div>

        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-2xl ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
