"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

/** Refresh the kanban when another member changes a deal in this organization. */
export function DealsRealtime({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`deals-${organizationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deals", filter: `organization_id=eq.${organizationId}` }, () => {
        router.refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organizationId, router]);
  return null;
}
