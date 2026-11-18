"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Supabase Realtime (RLS applies, so users only receive rows they may read)
 * and re-renders server components when meetings, events or alerts change.
 * Refreshes are debounced so a burst of changes causes one re-render.
 */
export function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 1500);
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
