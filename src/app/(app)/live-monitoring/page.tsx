import { getVenueOverviews } from "@/lib/data/queries";
import { parseVenueFilters } from "@/lib/filters";
import { VenueCard } from "@/components/monitoring/venue-card";
import { VenueFilters } from "@/components/monitoring/venue-filters";

export default async function LiveMonitoringPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters = parseVenueFilters(sp);
  const venues = await getVenueOverviews(filters);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Live Monitoring</h1>
        <p className="mt-1 text-sm text-slate-500">
          Operational status for each venue. This view shows meeting metadata only; open a venue&apos;s meeting link to see its session.
        </p>
      </div>
      <VenueFilters action="/live-monitoring" q={filters.q} category={filters.category} status={filters.status} />
      {venues.length === 0 ? (
        <p className="glass rounded-3xl border-dashed p-8 text-center text-sm text-slate-500">
          No venues match. {Object.keys(sp).length === 0 && "Seed demo data from Settings to populate the dashboard."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {venues.map((v) => <VenueCard key={v.id} venue={v} />)}
        </div>
      )}
    </div>
  );
}
