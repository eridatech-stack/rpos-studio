"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({
  intervalMs = 15000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  async function refreshNow() {
    setRefreshing(true);
    router.refresh();

    window.setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, intervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [intervalMs, router]);

  return (
    <button
      type="button"
      onClick={refreshNow}
      title={`Auto-refreshing every ${Math.round(
        intervalMs / 1000
      )} seconds. Click to refresh now.`}
      aria-label="Refresh page data"
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={refreshing}
    >
      <span
        className={refreshing ? "animate-spin" : ""}
        aria-hidden="true"
      >
        ↻
      </span>
    </button>
  );
}
