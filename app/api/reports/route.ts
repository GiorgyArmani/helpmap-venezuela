import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { clientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { cleanName, cleanText } from "@/lib/sanitize";
import { sendReportEmail } from "@/lib/email";

// Missing-person reports — the PUBLIC "Reportar desaparecido" flow (the "+" FAB). A
// family/citizen tells us WHO they are looking for; we store it in a staff-only queue
// (missing_reports) AND email the team so it lands "al mail y a la app" (CLAUDE.md §14).
// NOT the intake funnel (that seeds patients) and NOT a contribution (that enriches an
// existing record) — this is a lead/request the team works from the admin "Reportes" tab.
//
//   POST  (public) → insert a 'pending' report (rate-limited, sanitized) + email the team.
//   GET   (staff)  → list pending reports.
//   PATCH (staff)  → mark reviewed / closed.
//
// Reads/writes go through the cookie-bound Supabase session (anon for the public, the
// staff member's own session for GET/PATCH), so RLS in db/missing_reports.sql is the
// enforcement layer. No service_role here (CLAUDE.md §12).

// Per-IP flood guard on the PUBLIC submit. An insert + an email per call, so cap it so a
// script can't flood the queue or the team inbox (same posture as /api/contributions).
const RATE_LIMIT = 10; // requests per window per IP
const RATE_WINDOW_MS = 60_000;

async function staffSession() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false as const, status: 401, supabase, uid: null };
  const { data: role } = await supabase.from("admin_users").select("role").eq("user_id", uid).maybeSingle();
  if (role?.role !== "admin" && role?.role !== "volunteer")
    return { ok: false as const, status: 403, supabase, uid: null };
  return { ok: true as const, supabase, uid };
}

// ---- Public submit -------------------------------------------------------------
export async function POST(request: Request) {
  const rl = rateLimit(`reports:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: rl.retryAfter },
      { status: 429, headers: { ...rateLimitHeaders(rl), "Retry-After": String(rl.retryAfter) } },
    );
  }

  let b: {
    apellidos?: string; nombres?: string; ci?: string | null; edad?: string | number | null;
    zona?: string | null; descripcion?: string | null; reporter_name?: string; reporter_contact?: string | null;
  };
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  // Sanitize: names → cleanName (no links/markup); free text → cleanText (keeps caps).
  const apellidos = cleanName(b.apellidos);
  const nombres = cleanName(b.nombres);
  // A report is useless without a name to look for.
  if (!apellidos && !nombres) return NextResponse.json({ error: "missing_name" }, { status: 422 });

  const ci = cleanText(b.ci, 30) || null;
  const edadNum = b.edad != null && b.edad !== "" ? Math.trunc(Number(b.edad)) : NaN;
  const edad = Number.isFinite(edadNum) && edadNum >= 0 && edadNum < 130 ? edadNum : null;
  const zona = cleanText(b.zona, 200) || null;
  const descripcion = cleanText(b.descripcion, 2000) || null;
  const reporter_name = cleanName(b.reporter_name) || null;
  const reporter_contact = cleanText(b.reporter_contact, 200) || null;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("missing_reports")
    .insert({ apellidos, nombres, ci, edad, zona, descripcion, reporter_name, reporter_contact, status: "pending" });
  if (error) {
    // Most common cause: db/missing_reports.sql not run yet (relation missing), or the
    // anon-insert RLS policy is absent. Surface the real reason for diagnosis.
    console.error("[reports] insert failed:", error.code, error.message, error.details ?? "");
    return NextResponse.json({ error: "insert_failed", code: error.code, message: error.message }, { status: 502 });
  }

  // Best-effort email to the team (never fails the request — the DB row already landed).
  try {
    await sendReportEmail({ apellidos, nombres, ci, edad, zona, descripcion, reporterName: reporter_name ?? undefined, reporterContact: reporter_contact });
  } catch (e) {
    console.error("[reports] email failed (row saved):", e);
  }

  return NextResponse.json({ ok: true });
}

// ---- Staff: list pending -------------------------------------------------------
export async function GET() {
  const gate = await staffSession();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });
  const { supabase } = gate;

  const { data: rows, error } = await supabase
    .from("missing_reports")
    .select("id, apellidos, nombres, ci, edad, zona, descripcion, reporter_name, reporter_contact, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "read_failed" }, { status: 502 });

  return NextResponse.json({ reports: rows ?? [] });
}

// ---- Staff: mark reviewed / closed ---------------------------------------------
export async function PATCH(request: Request) {
  const gate = await staffSession();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });
  const { supabase, uid } = gate;

  let b: { id?: string; action?: "reviewed" | "closed" };
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!b.id || (b.action !== "reviewed" && b.action !== "closed"))
    return NextResponse.json({ error: "bad_request" }, { status: 422 });

  const { error } = await supabase
    .from("missing_reports")
    .update({ status: b.action, reviewed_by: uid, reviewed_at: new Date().toISOString() })
    .eq("id", b.id);
  if (error) {
    console.error("[reports] status update failed:", b.id, error.message);
    return NextResponse.json({ error: "update_failed", message: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
