"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Site = {
  id: string;
  site_name: string;
  domain: string;
};

export function SiteSelector({
  sites,
  selectedSiteId,
}: {
  sites: Site[];
  selectedSiteId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function changeSite(siteId: string) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    params.set("siteId", siteId);

    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div>
      <label
        htmlFor="site-selector"
        className="text-sm font-semibold text-slate-500"
      >
        Active site
      </label>

      <select
        id="site-selector"
        value={selectedSiteId}
        onChange={(event) =>
          changeSite(event.target.value)
        }
        className="mt-2 min-w-72 rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-800 shadow-sm"
      >
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.site_name} — {site.domain}
          </option>
        ))}
      </select>
    </div>
  );
}