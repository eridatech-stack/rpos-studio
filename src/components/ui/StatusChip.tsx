const styles: Record<
  string,
  {
    label: string;
    icon: string;
    className: string;
  }
> = {
  approved: {
    label: "Approved",
    icon: "✅",
    className: "bg-green-100 text-green-700",
  },
  planned: {
    label: "Planned",
    icon: "📋",
    className: "bg-slate-100 text-slate-700",
  },
  outline_ready: {
    label: "Outline Ready",
    icon: "🧩",
    className: "bg-purple-100 text-purple-700",
  },
  draft_ready: {
    label: "Draft Ready",
    icon: "📝",
    className: "bg-blue-100 text-blue-700",
  },
  wordpress_draft: {
    label: "Waiting for Review",
    icon: "👀",
    className: "bg-orange-100 text-orange-700",
  },
  human_review: {
    label: "Human Review",
    icon: "👤",
    className: "bg-orange-100 text-orange-700",
  },
  published: {
    label: "Published",
    icon: "🌐",
    className: "bg-green-100 text-green-700",
  },
  queued: {
    label: "Queued",
    icon: "⏳",
    className: "bg-amber-100 text-amber-700",
  },
  running: {
    label: "Running",
    icon: "⚙️",
    className: "bg-blue-100 text-blue-700",
  },
  completed: {
    label: "Completed",
    icon: "✅",
    className: "bg-green-100 text-green-700",
  },
  failed: {
    label: "Failed",
    icon: "❌",
    className: "bg-red-100 text-red-700",
  },
  cancelled: {
    label: "Cancelled",
    icon: "⛔",
    className: "bg-slate-200 text-slate-700",
  },
};

export function StatusChip({
  status,
}: {
  status: string | null | undefined;
}) {
  const safeStatus = status || "unknown";

  const configuration = styles[safeStatus] || {
    label: safeStatus.replaceAll("_", " "),
    icon: "•",
    className: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize ${configuration.className}`}
    >
      <span>{configuration.icon}</span>
      <span>{configuration.label}</span>
    </span>
  );
}