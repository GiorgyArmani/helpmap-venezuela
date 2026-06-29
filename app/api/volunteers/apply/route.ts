import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rateLimit";

// Public volunteer self-signup. The applicant chooses their OWN password here; we create a
// pre-confirmed auth user with NO role (so the account exists but has zero access — is_staff()
// is false until an admin grants the role) and store an application row for admin review.
// Access is then granted by an admin Approve (insert the role) — no email needed, the person
// already knows their password (CLAUDE.md §9/§14).
//
// SECURITY: this uses the service_role (server-only) on a PUBLIC route — a deliberate, narrow
// extension of the §12 service_role exception. It is heavily constrained: rate-limited per IP,
// validates input, and the accounts it creates have ZERO privileges until an admin approves.
// It writes the request row with the REAL user_id it just created, so the approval can never be
// pointed at someone else's account.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = 3; // signups
const RATE_WINDOW_MS = 60_000; // per minute per IP

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function POST(request: Request) {
  const rl = rateLimit(`vol-apply:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const email = str(body.email, 200).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const nombre = str(body.nombre, 120);
  const perfil = str(body.perfil, 60);
  const fuentes = str(body.fuentes, 1000);
  const telefono = str(body.telefono, 40);

  if (!isEmail(email)) return NextResponse.json({ error: "invalid_email" }, { status: 422 });
  if (!nombre) return NextResponse.json({ error: "missing_name" }, { status: 422 });
  if (password.length < 6) return NextResponse.json({ error: "weak_password" }, { status: 422 });

  const admin = createAdminClient();

  // Create the auth user, pre-confirmed (so they can sign in immediately once approved),
  // with NO role → zero access until an admin grants it.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    // Most common case: the email is already registered.
    const dup = /already|registered|exists/i.test(createErr?.message || "");
    return NextResponse.json({ error: dup ? "email_taken" : "create_failed" }, { status: dup ? 409 : 400 });
  }

  // Store the application for admin review, linked to the real user_id. If this fails,
  // roll back the auth user so we never leave an orphan account with no application.
  const { error: insErr } = await admin.from("volunteer_requests").insert({
    user_id: created.user.id,
    email,
    nombre,
    perfil: perfil || null,
    fuentes: fuentes || null,
    telefono: telefono || null,
  });
  if (insErr) {
    // Surface the real cause: missing table / missing user_id column → run db/volunteer_requests.sql.
    console.error("[volunteers/apply] insert failed:", insErr.message, insErr.details ?? "");
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "insert_failed", detail: insErr.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
