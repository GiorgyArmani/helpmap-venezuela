import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { clientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { cleanText } from "@/lib/sanitize";

// Per-IP flood guard on the PUBLIC submit (POST). A contribution can upload a photo +
// insert a queue row, so cap it so a script can't flood the moderation queue / storage.
// GET/PATCH are staff-gated (auth), so they don't need this.
const RATE_LIMIT = 10; // requests per window per IP
const RATE_WINDOW_MS = 60_000;

// Private bucket holding UNREVIEWED contribution photos (db/storage_photos.sql). On
// approval the file is copied into the public intake-photos bucket; staff preview it
// via a signed URL. Kept in sync with NEXT_PUBLIC_SUPABASE_CONTRIB_BUCKET.
const CONTRIB_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_CONTRIB_BUCKET ?? "contrib-photos";
const PUBLIC_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_INTAKE_BUCKET ?? "intake-photos";

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
  const rl = rateLimit(`contrib:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: rl.retryAfter },
      { status: 429, headers: { ...rateLimitHeaders(rl), "Retry-After": String(rl.retryAfter) } },
    );
  }

  let b: { patient_id?: string; foto_url?: string | null; descripcion?: string | null; contacto?: string | null };
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!b.patient_id || typeof b.patient_id !== "string") return NextResponse.json({ error: "missing_patient" }, { status: 422 });
  // patient_id must be a UUID — reject anything else before it hits the DB/filters.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.patient_id))
    return NextResponse.json({ error: "bad_patient" }, { status: 422 });

  let foto = b.foto_url?.trim() || null;
  // SECURITY: the legit "colaborar" flow uploads to the PRIVATE contrib bucket and
  // submits an OBJECT PATH (no scheme). Reject any client-supplied URL/scheme so an
  // attacker can't get an arbitrary external image attached to a patient on approval
  // (the approve path trusts an http(s) foto_url as-is). Only bare paths are allowed.
  if (foto && /^[a-z][a-z0-9+.-]*:/i.test(foto)) {
    console.warn(`[contributions] rejected scheme'd foto_url from ${clientIp(request)}`);
    foto = null;
  }
  // Sanitize stored free text (strip angle brackets / markup; cap length). Shown to
  // staff in the moderation card — defense-in-depth against stored markup (§14).
  const desc = cleanText(b.descripcion, 2000) || null;
  const contacto = cleanText(b.contacto, 200) || null;
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

  // foto_url is a PATH in the PRIVATE contrib-photos bucket (not publicly reachable).
  // Sign it so staff can preview it in the moderation card. Legacy rows that still hold
  // a full http(s) URL (uploaded before this change) pass through untouched.
  const signed = await Promise.all(
    (rows ?? []).map(async (r) => {
      if (!r.foto_url || r.foto_url.startsWith("http")) return r;
      const { data: s } = await supabase.storage
        .from(CONTRIB_BUCKET)
        .createSignedUrl(r.foto_url, 60 * 30); // 30 min — long enough to review
      return { ...r, foto_url: s?.signedUrl ?? null };
    })
  );

  // Attach the patient's public name so the reviewer knows who each one is for.
  const ids = Array.from(new Set(signed.map((r) => r.patient_id)));
  const names: Record<string, string> = {};
  if (ids.length) {
    const { data: pats } = await supabase.from("patients_public").select("id, nombres, apellidos").in("id", ids);
    (pats ?? []).forEach((p) => {
      names[p.id] = `${p.nombres ?? ""} ${p.apellidos ?? ""}`.trim();
    });
  }
  const contributions = signed.map((r) => ({ ...r, patient_name: names[r.patient_id] ?? "—" }));
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
        // Publish: the pending photo lives as a PATH in the private contrib-photos
        // bucket. Copy it into the public intake-photos bucket and store THAT public
        // URL on the patient. Legacy rows holding a full http(s) URL (uploaded before
        // the private-bucket change) are attached as-is.
        let publicUrl = c.foto_url;
        if (!c.foto_url.startsWith("http")) {
          const { data: blob, error: dlErr } = await supabase.storage.from(CONTRIB_BUCKET).download(c.foto_url);
          if (dlErr || !blob) {
            // Usually: db/storage_photos.sql not run (no contrib-photos bucket / no staff
            // download policy), or the stored path is stale. Surface the real reason.
            console.error("[contributions] download failed:", CONTRIB_BUCKET, c.foto_url, dlErr?.message ?? "no blob");
            return NextResponse.json({ error: "publish_failed", stage: "download", message: dlErr?.message }, { status: 502 });
          }
          const pubPath = `contrib/${c.foto_url.split("/").pop()}`;
          const { error: upErr } = await supabase.storage
            .from(PUBLIC_BUCKET)
            .upload(pubPath, blob, { contentType: "image/jpeg", upsert: true });
          if (upErr) {
            console.error("[contributions] upload failed:", PUBLIC_BUCKET, pubPath, upErr.message);
            return NextResponse.json({ error: "publish_failed", stage: "upload", message: upErr.message }, { status: 502 });
          }
          publicUrl = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(pubPath).data.publicUrl;
        }
        // Bump the edit clock so the every-poll Sheets→Supabase pipeline (Workflow C
        // timestamp gate) doesn't clobber this attached photo. See CLAUDE.md.
        const { error: attErr } = await supabase
          .from("patients")
          .update({ foto_url: publicUrl, data_updated_at: new Date().toISOString() })
          .eq("id", c.patient_id);
        if (attErr) {
          console.error("[contributions] attach failed:", c.patient_id, attErr.message);
          return NextResponse.json({ error: "attach_failed", message: attErr.message }, { status: 502 });
        }
      }
    }
  }

  const { error } = await supabase
    .from("contributions")
    .update({ status: b.action === "approve" ? "approved" : "rejected", reviewed_by: uid, reviewed_at: new Date().toISOString() })
    .eq("id", b.id);
  if (error) {
    console.error("[contributions] status update failed:", b.id, error.message);
    return NextResponse.json({ error: "update_failed", message: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
