import { CATEGORIES, MEETING_STATUSES } from "@/lib/labels";
import type { Category, MeetingStatus } from "@/lib/types";
import type { VenueFilters } from "@/lib/data/queries";

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Whitelists URL search params into typed filters. */
export function parseVenueFilters(p: Params): VenueFilters {
  const category = first(p.category) as Category | undefined;
  const status = first(p.status) as MeetingStatus | undefined;
  const day = Number(first(p.day));
  return {
    day: day === 1 || day === 2 ? day : undefined,
    q: first(p.q)?.slice(0, 80) || undefined,
    category: category && CATEGORIES.includes(category) ? category : undefined,
    status: status && MEETING_STATUSES.includes(status) ? status : undefined,
  };
}
