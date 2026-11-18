"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Supabase Realtime (RLS applies, so users only receive rows they may read)
 * and re-renders server components when meetings, events or alerts change.
 * Refreshes are throttled, not debounced: the first change in a burst schedules one refresh ~1.5s later and
 * further changes do not push it back. (A debounce starves under the simulator's constant stream of events
 * and the page would never update.)
 */
export function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) return; // a refresh is already scheduled
      timer = setTimeout(() => {
        timer = undefined;
        router.refresh();
      }, 1500);
    };

    const channel = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "meeting_events" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, refresh)
      .subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
