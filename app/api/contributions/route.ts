import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Moderation queue for public photo/info contributions to EXISTING patient records
// (the per-patient "Aportar foto / info" button). NOT the intake/n8n funnel — intake
// is for people not yet in the system; this enriches a record that already exists.
//
//   POST  (public)  → insert a 'pending' contribution. Minor target → photo stripped.
//   GET   (staff)   → list pending contributions (with the patient's public name).
//   PATCH (staff)   → approve (attach foto_url to the patient) or reject.
//
// Reads/writes go through the cookie-bound Supabase session (anon for the public,
// the staff member's own session for GET/PATCH), so RLS in db/contributions.sql is
// the enforcement layer. No service_role here (CLAUDE.md §12).

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
  let b: { patient_id?: string; foto_url?: string | null; descripcion?: string | null; contacto?: string | null };
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!b.patient_id) return NextResponse.json({ error: "missing_patient" }, { status: 422 });

  const foto = b.foto_url?.trim() || null;
  const desc = b.descripcion?.trim() || null;
  const contacto = b.contacto?.trim() || null;
  // Require at least one of photo/description — an empty contribution is noise.
  if (!foto && !desc) return NextResponse.json({ error: "empty" }, { status: 422 });

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Defense-in-depth (CLAUDE.md §2): never let a minor carry a photo. The DB trigger
  // also strips it, but we drop it here too so a minor photo never even reaches storage's URL.
  let foto_url = foto;
  if (foto_url) {
    const { data: pat } = await supabase.from("patients_public").select("is_minor").eq("id", b.patient_id).maybeSingle();
    if (pat?.is_minor) foto_url = null;
  }

  const { error } = await supabase
    .from("contributions")
    .insert({ patient_id: b.patient_id, foto_url, descripcion: desc, contacto, status: "pending" });
  if (error) {
    // Most common cause: db/contributions.sql not run yet (relation missing), or the
    // anon-insert RLS policy is absent. Surface the real reason for diagnosis.
    console.error("[contributions] insert failed:", error.code, error.message, error.details ?? "");
    return NextResponse.json({ error: "insert_failed", code: error.code, message: error.message }, { status: 502 });
  }

  // "Received for review" — never published until a staff member approves it (§8).
  return NextResponse.json({ ok: true });
}

// ---- Staff: list pending -------------------------------------------------------
export async function GET() {
  const gate = await staffSession();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });
  const { supabase } = gate;

  const { data: rows, error } = await supabase
    .from("contributions")
    .select("id, patient_id, foto_url, descripcion, contacto, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "read_failed" }, { status: 502 });

  // Attach the patient's public name so the reviewer knows who each one is for.
  const ids = Array.from(new Set((rows ?? []).map((r) => r.patient_id)));
  const names: Record<string, string> = {};
  if (ids.length) {
    const { data: pats } = await supabase.from("patients_public").select("id, nombres, apellidos").in("id", ids);
    (pats ?? []).forEach((p) => {
      names[p.id] = `${p.nombres ?? ""} ${p.apellidos ?? ""}`.trim();
    });
  }
  const contributions = (rows ?? []).map((r) => ({ ...r, patient_name: names[r.patient_id] ?? "—" }));
  return NextResponse.json({ contributions });
}

// ---- Staff: approve / reject ---------------------------------------------------
export async function PATCH(request: Request) {
  const gate = await staffSession();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });
  const { supabase, uid } = gate;

  let b: { id?: string; action?: "approve" | "reject" };
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!b.id || (b.action !== "approve" && b.action !== "reject"))
    return NextResponse.json({ error: "bad_request" }, { status: 422 });

  // Load the contribution (RLS: staff can read).
  const { data: c } = await supabase
    .from("contributions")
    .select("id, patient_id, foto_url")
    .eq("id", b.id)
    .maybeSingle();
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (b.action === "approve") {
    // Attach the photo to the patient — but only for an adult target (the view's
    // is_minor is authoritative). The photo only becomes publicly visible once the
    // record is also `verified` (patients_public nulls foto_url otherwise, §8); we
    // intentionally do NOT change `verified` here.
    if (c.foto_url) {
      const { data: pat } = await supabase.from("patients_public").select("is_minor").eq("id", c.patient_id).maybeSingle();
      if (!pat?.is_minor) {
        const { error: upErr } = await supabase.from("patients").update({ foto_url: c.foto_url }).eq("id", c.patient_id);
        if (upErr) return NextResponse.json({ error: "attach_failed" }, { status: 502 });
      }
    }
  }

  const { error } = await supabase
    .from("contributions")
    .update({ status: b.action === "approve" ? "approved" : "rejected", reviewed_by: uid, reviewed_at: new Date().toISOString() })
    .eq("id", b.id);
  if (error) return NextResponse.json({ error: "update_failed" }, { status: 502 });

  return NextResponse.json({ ok: true });
}
