"use client";

// Staff/admin data feed: the moderation queues + activity log + volunteer roster the
// staff panel reads, plus the "needs attention" preload and the light 60s auto-refresh
// (CLAUDE.md §"Novedades"/§"Public-write hardening"). Owns this state so HelpMap doesn't;
// the review/mutation handlers stay in HelpMap and call the setters/loaders returned here.
// Pure data (Supabase + our API routes) — no Leaflet. Extracted from HelpMap.tsx (§14 Phase 3).

import { useCallback, useEffect, useState } from "react";
import { type Rescatado, type VolunteerRequest } from "./data";
import type { AuditEntry, MissingReport } from "./types";
import type { ContribRow, VolunteerRow } from "./AdminContext";
import type { createClient } from "@/utils/supabase/client";

type SupabaseClient = ReturnType<typeof createClient>;
type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

export interface StaffFeed {
  contribs: ContribRow[];
  setContribs: Setter<ContribRow[]>;
  reports: MissingReport[];
  setReports: Setter<MissingReport[]>;
  audit: AuditEntry[];
  setAudit: Setter<AuditEntry[]>;
  rescAdmin: Rescatado[];
  setRescAdmin: Setter<Rescatado[]>;
  volReqs: VolunteerRequest[];
  setVolReqs: Setter<VolunteerRequest[]>;
  volunteers: VolunteerRow[];
  setVolunteers: Setter<VolunteerRow[]>;
  loadContributions: () => Promise<void>;
  loadReports: () => Promise<void>;
  loadAudit: () => Promise<void>;
  loadRescAdmin: () => Promise<void>;
  loadVolunteers: () => Promise<void>;
  loadVolRequests: () => Promise<void>;
}

export function useStaffFeed(
  getSupabase: () => SupabaseClient,
  isAdmin: boolean,
  isVolunteer: boolean,
  view: string | null,
): StaffFeed {
  const [contribs, setContribs] = useState<ContribRow[]>([]);
  const [reports, setReports] = useState<MissingReport[]>([]); // pending missing-person reports (staff)
  const [audit, setAudit] = useState<AuditEntry[]>([]); // recent changes from the DB audit_log
  const [rescAdmin, setRescAdmin] = useState<Rescatado[]>([]); // staff-only full base rows for the admin tab
  const [volReqs, setVolReqs] = useState<VolunteerRequest[]>([]); // pending applications (admin)
  const [volunteers, setVolunteers] = useState<VolunteerRow[]>([]);

  const loadContributions = useCallback(async () => {
    try {
      const res = await fetch("/api/contributions");
      if (!res.ok) return;
      const j = await res.json();
      setContribs(Array.isArray(j.contributions) ? j.contributions : []);
    } catch {
      /* offline / non-fatal */
    }
  }, []);
  // Staff-only: pending missing-person reports (the public "Reportar" queue). GET is
  // staff-gated; tolerates the table not existing yet (pre db/missing_reports.sql).
  const loadReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) return;
      const j = await res.json();
      setReports(Array.isArray(j.reports) ? j.reports : []);
    } catch {
      /* offline / non-fatal */
    }
  }, []);
  // Staff-only: the activity feed. RLS gates audit_log to is_staff(); tolerates the
  // table not existing yet (pre-migration) so nothing breaks before db/audit_log.sql.
  const loadAudit = useCallback(async () => {
    try {
      const { data, error } = await getSupabase()
        .from("audit_log")
        .select("id, created_at, actor_email, actor_role, action, entity_type, entity_id, summary")
        .order("created_at", { ascending: false })
        .limit(120);
      if (!error && data) setAudit(data as AuditEntry[]);
    } catch {
      /* offline / table absent — non-fatal */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Staff-only: load the FULL rescatados base rows (admin fields included) for the
  // admin tab. RLS gates this to is_staff(); anon never reaches the base table.
  const loadRescAdmin = useCallback(async () => {
    try {
      const { data, error } = await getSupabase()
        .from("rescatados")
        .select("*")
        .eq("promoted", false)
        .order("created_at", { ascending: false });
      if (!error && data) setRescAdmin(data as Rescatado[]);
    } catch {
      /* offline / non-fatal */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Admin-only (via server API): the provisioned volunteer roster.
  const loadVolunteers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/volunteers");
      if (!res.ok) return;
      const j = await res.json();
      setVolunteers(Array.isArray(j.volunteers) ? j.volunteers : []);
    } catch {
      /* offline / non-fatal */
    }
  }, []);
  // Admin: pending volunteer applications (approve/reject happens in HelpMap).
  const loadVolRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/volunteers?requests=1");
      if (!res.ok) return;
      const j = await res.json();
      setVolReqs(Array.isArray(j.requests) ? j.requests : []);
    } catch {
      /* offline / non-fatal */
    }
  }, []);

  // Preload the "needs attention" counts as soon as a staff session resolves, so the
  // gear badge is accurate before the panel is even opened. Admin also gets the pending
  // volunteer applications; volunteers only see the aportes count.
  useEffect(() => {
    if (!(isAdmin || isVolunteer)) return;
    loadContributions();
    loadReports();
    loadAudit();
    if (isAdmin) loadVolRequests();
  }, [isAdmin, isVolunteer, loadContributions, loadReports, loadAudit, loadVolRequests]);
  // Light auto-refresh (no realtime backend yet — CLAUDE.md §"Novedades" pending). While a
  // staff session is active we re-pull the cheap "needs attention" counts every 60s so the
  // gear badge stays live even before the panel is opened; the heavier 120-row audit feed is
  // only re-pulled while the admin panel is actually open. Skipped when the tab is hidden to
  // save the flaky-3G data budget (§6); a fresh pull also runs on becoming visible again.
  useEffect(() => {
    if (!(isAdmin || isVolunteer)) return;
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadContributions();
      loadReports();
      if (isAdmin) loadVolRequests();
      if (view === "admin") loadAudit();
    };
    const id = window.setInterval(tick, 60_000);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isAdmin, isVolunteer, view, loadContributions, loadReports, loadVolRequests, loadAudit]);

  return {
    contribs, setContribs,
    reports, setReports,
    audit, setAudit,
    rescAdmin, setRescAdmin,
    volReqs, setVolReqs,
    volunteers, setVolunteers,
    loadContributions, loadReports, loadAudit, loadRescAdmin, loadVolunteers, loadVolRequests,
  };
}
