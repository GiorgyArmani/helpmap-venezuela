import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendVolunteerWelcome } from "@/lib/email";

// Admin-only API to manage volunteer accounts.
//   POST   { email, password }  → create auth user + admin_users(role='volunteer'), email welcome
//   GET                         → list volunteers [{ user_id, email, created_at }]
//   DELETE { user_id }          → revoke (delete role row + auth user)
//
// Every method first verifies the CALLER is an admin (their session JWT must map to
// admin_users.role='admin'). Only then does it use the service_role admin client.

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false as const, status: 401 };
  const { data: role } = await supabase.from("admin_users").select("role").eq("user_id", uid).maybeSingle();
  if (role?.role !== "admin") return { ok: false as const, status: 403 };
  return { ok: true as const, uid };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.helpmapvzla.net";

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }

  const admin = createAdminClient();

  // Create the auth user (email pre-confirmed so they can sign in immediately).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    return NextResponse.json({ error: "create_failed", detail: createErr?.message }, { status: 400 });
  }

  // Grant the volunteer role. Roll back the auth user if the role insert fails so
  // we never leave an account with no role.
  const { error: roleErr } = await admin
    .from("admin_users")
    .insert({ user_id: created.user.id, role: "volunteer" });
  if (roleErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "role_failed", detail: roleErr.message }, { status: 400 });
  }

  const emailed = await sendVolunteerWelcome(email, password, SITE_URL);
  return NextResponse.json({ ok: true, user_id: created.user.id, emailed });
}

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  const admin = createAdminClient();
  const { data: roles, error } = await admin.from("admin_users").select("user_id").eq("role", "volunteer");
  if (error) return NextResponse.json({ error: "list_failed" }, { status: 500 });

  const ids = new Set((roles ?? []).map((r) => r.user_id as string));
  // Map ids → emails. listUsers is paginated; one page (default) is plenty here.
  const { data: usersPage } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const volunteers = (usersPage?.users ?? [])
    .filter((u) => ids.has(u.id))
    .map((u) => ({ user_id: u.id, email: u.email ?? "", created_at: u.created_at }));

  return NextResponse.json({ volunteers });
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  let body: { user_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const userId = body.user_id;
  if (!userId) return NextResponse.json({ error: "missing_user_id" }, { status: 422 });

  const admin = createAdminClient();
  // Only ever revoke a volunteer — never let this delete an admin.
  const { data: row } = await admin.from("admin_users").select("role").eq("user_id", userId).maybeSingle();
  if (row?.role !== "volunteer") {
    return NextResponse.json({ error: "not_a_volunteer" }, { status: 409 });
  }
  await admin.from("admin_users").delete().eq("user_id", userId);
  await admin.auth.admin.deleteUser(userId);
  return NextResponse.json({ ok: true });
}
