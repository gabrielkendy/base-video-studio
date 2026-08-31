"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Job } from "@/types";

/**
 * Mantém a lista de jobs sincronizada via:
 *  1) fetch inicial
 *  2) Supabase Realtime (INSERT/UPDATE/DELETE ao vivo)
 *  3) Polling de segurança: enquanto houver job QUEUED/PROCESSING, chama
 *     /api/jobs/sync (que consulta a fal e conclui os prontos) e re-busca a
 *     lista — cobre o caso do webhook não chegar e do Realtime falhar.
 */
export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);
    setJobs((data as Job[]) ?? []);
  }, []);

  // fetch inicial + Realtime
  useEffect(() => {
    const supabase = createBrowserClient();
    let active = true;

    supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80)
      .then(({ data }) => {
        if (!active) return;
        setJobs((data as Job[]) ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel("jobs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        (payload) => {
          setJobs((prev) => {
            if (payload.eventType === "INSERT") {
              const next = payload.new as Job;
              if (prev.some((j) => j.id === next.id)) return prev;
              return [next, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const next = payload.new as Job;
              return prev.map((j) => (j.id === next.id ? next : j));
            }
            if (payload.eventType === "DELETE") {
              const old = payload.old as Job;
              return prev.filter((j) => j.id !== old.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Polling de segurança enquanto há jobs ativos
  const hasActive = jobs.some(
    (j) => j.status === "QUEUED" || j.status === "PROCESSING"
  );
  const syncing = useRef(false);

  useEffect(() => {
    if (!hasActive) return;

    const tick = async () => {
      if (syncing.current) return;
      syncing.current = true;
      try {
        await fetch("/api/jobs/sync", { cache: "no-store" });
        await refetch();
      } catch {
        /* ignora */
      } finally {
        syncing.current = false;
      }
    };

    tick(); // roda já na hora
    const interval = setInterval(tick, 8000);
    return () => clearInterval(interval);
  }, [hasActive, refetch]);

  return { jobs, loading };
}
