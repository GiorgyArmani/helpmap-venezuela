"use client";

// Cache-first data layer for HelpMap: hydrate instantly from localStorage, then
// revalidate from Supabase in the background (CLAUDE.md §6 offline resilience).
// Owns the public dataset the app reads; HelpMap gets state + setters back and keeps
// using the setters in its admin/save handlers. Extracted from HelpMap.tsx (§14 Phase 3).

import { useEffect, useState } from "react";
import {
  protectMinor,
  protectMinorRescatado,
  type Donation,
  type Location,
  type PatientPublic,
  type Refugio,
  type RescatadoPublic,
} from "./data";
import { CACHE_KEY } from "./constants";
import type { createClient } from "@/utils/supabase/client";

type SupabaseClient = ReturnType<typeof createClient>;

export interface HelpMapData {
  locations: Location[];
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>;
  patients: PatientPublic[];
  setPatients: React.Dispatch<React.SetStateAction<PatientPublic[]>>;
  donations: Donation[];
  setDonations: React.Dispatch<React.SetStateAction<Donation[]>>;
  rescatados: RescatadoPublic[];
  setRescatados: React.Dispatch<React.SetStateAction<RescatadoPublic[]>>;
  refugios: Refugio[];
  setRefugios: React.Dispatch<React.SetStateAction<Refugio[]>>;
  maintenance: boolean;
  setMaintenance: React.Dispatch<React.SetStateAction<boolean>>;
  stale: boolean;
  setStale: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useHelpMapData(getSupabase: () => SupabaseClient): HelpMapData {
  const [locations, setLocations] = useState<Location[]>([]);
  const [patients, setPatients] = useState<PatientPublic[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [rescatados, setRescatados] = useState<RescatadoPublic[]>([]); // rescued, not yet transferred (no map pin)
  const [refugios, setRefugios] = useState<Refugio[]>([]); // shelter needs/donations info (companion to shelter locations)
  const [maintenance, setMaintenance] = useState(false); // site-wide maintenance banner (admin toggle, app_settings)
  const [stale, setStale] = useState(false);

  // Cache-first, then revalidate from Supabase.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let hadCache = false;
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const c = JSON.parse(raw) as {
            locations?: Location[];
            patients?: PatientPublic[];
            donations?: Donation[];
            rescatados?: RescatadoPublic[];
            refugios?: Refugio[];
          };
          if (Array.isArray(c.locations)) {
            setLocations(c.locations);
            hadCache = c.locations.length > 0;
          }
          // Re-enforce minor protection on cached data — a stale/poisoned cache
          // must never reintroduce a minor photo/CI (CLAUDE.md §2).
          if (Array.isArray(c.patients)) setPatients(c.patients.map(protectMinor));
          if (Array.isArray(c.donations)) setDonations(c.donations);
          if (Array.isArray(c.rescatados)) setRescatados(c.rescatados.map(protectMinorRescatado));
          if (Array.isArray(c.refugios)) setRefugios(c.refugios);
        }
      } catch {
        /* ignore */
      }
      try {
        const supabase = getSupabase();
        // PostgREST caps a single response at db-max-rows (default 1000), so `.limit()`
        // alone silently truncates once we pass ~1000 records (the "1000 personas" bug).
        // Page through with .range() until a short page comes back to fetch them all.
        const fetchAll = async (
          table: string,
          orderCol: string,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ): Promise<{ data: any[] | null; error: any }> => {
          const PAGE = 1000;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const all: any[] = [];
          for (let from = 0; ; from += PAGE) {
            const { data, error } = await supabase
              .from(table)
              .select("*")
              .order(orderCol, { ascending: false })
              .range(from, from + PAGE - 1);
            if (error) return { data: null, error };
            const rows = data ?? [];
            all.push(...rows);
            if (rows.length < PAGE) break; // last page
          }
          return { data: all, error: null };
        };
        const [locRes, patRes, donRes, setRes, rescRes, refRes] = await Promise.all([
          supabase.from("locations").select("*").eq("active", true),
          // Reads the privacy-filtered VIEW, never the base table (CLAUDE.md §2).
          fetchAll("patients_public", "updated_at"),
          supabase.from("donations").select("*").eq("active", true).order("sort", { ascending: true }),
          // Maintenance flag — non-critical; tolerate the table not existing yet.
          supabase.from("app_settings").select("maintenance").eq("id", 1).maybeSingle(),
          // Rescued (not-yet-transferred) people — privacy-filtered VIEW, non-critical.
          fetchAll("rescatados_public", "created_at"),
          // Shelter needs/donations info — non-critical; tolerate the table not existing yet.
          supabase.from("refugios").select("*"),
        ]);
        if (cancelled) return;
        if (locRes.error) throw locRes.error;
        if (patRes.error) throw patRes.error;
        // Maintenance banner: best-effort, never blocks the load.
        if (!setRes.error && setRes.data) setMaintenance(!!setRes.data.maintenance);
        // Donations are non-critical: if the table/policies aren't there yet, don't
        // blow up the whole load — keep whatever we have (cache/seed).
        const dons = donRes.error ? null : ((donRes.data ?? []) as Donation[]);
        // Rescatados are non-critical too (table may not exist yet). Minor-protected.
        const resc = rescRes.error ? null : ((rescRes.data ?? []) as RescatadoPublic[]).map(protectMinorRescatado);
        // Refugios are non-critical (table may not exist yet); no privacy filter needed.
        const refs = refRes.error ? null : ((refRes.data ?? []) as Refugio[]);
        const locs = (locRes.data ?? []) as Location[];
        // Defense in depth: enforce minor protection on every record from the
        // view before it touches state or the cache (CLAUDE.md §2).
        const pats = ((patRes.data ?? []) as PatientPublic[]).map(protectMinor);
        setLocations(locs);
        setPatients(pats);
        if (dons) setDonations(dons);
        if (resc) setRescatados(resc);
        if (refs) setRefugios(refs);
        setStale(false);
        try {
          const cached = JSON.stringify({ locations: locs, patients: pats, donations: dons ?? donations, rescatados: resc ?? rescatados, refugios: refs ?? refugios });
          localStorage.setItem(CACHE_KEY, cached);
        } catch {
          /* storage full — non-fatal */
        }
      } catch {
        // Offline / failed: keep showing cached data and flag it as possibly stale.
        if (!cancelled) setStale(hadCache);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Mount-only (matches the original effect): the cache-write fallback intentionally
    // reads the initial (empty) donations/rescatados/refugios closure on first run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    locations, setLocations,
    patients, setPatients,
    donations, setDonations,
    rescatados, setRescatados,
    refugios, setRefugios,
    maintenance, setMaintenance,
    stale, setStale,
  };
}
