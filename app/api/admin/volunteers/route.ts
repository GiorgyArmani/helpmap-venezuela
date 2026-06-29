import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendVolunteerWelcome } from "@/lib/email";

// Admin-only API to manage volunteer accounts + applications.
//   POST   { email, password }        → create auth user + admin_users(role='volunteer'), email welcome
//   GET                               → list volunteers [{ user_id, email, created_at }]
//   GET    ?requests=1                → list PENDING volunteer applications (volunteer_requests)
//   PATCH  { id, action: approve|reject } → approve (create account from the request) / reject
//   DELETE { user_id }                → revoke (delete role row + auth user)
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

type AdminClient = ReturnType<typeof createAdminClient>;

// Create the auth user + volunteer role + welcome email. Rolls back the auth user if the
// role insert fails so we never leave an account with no role. Shared by POST and approve.
async function provisionVolunteer(admin: AdminClient, email: string, password: string) {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    return { ok: false as const, status: 400, error: "create_failed", detail: createErr?.message };
  }
  const { error: roleErr } = await admin.from("admin_users").insert({ user_id: created.user.id, role: "volunteer" });
  if (roleErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false as const, status: 400, error: "role_failed", detail: roleErr.message };
  }
  const emailed = await sendVolunteerWelcome(email, password, SITE_URL);
  return { ok: true as const, user_id: created.user.id, emailed };
}

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
  const prov = await provisionVolunteer(admin, email, password);
  if (!prov.ok) {
    return NextResponse.json({ error: prov.error, detail: prov.detail }, { status: prov.status });
  }
  return NextResponse.json({ ok: true, user_id: prov.user_id, emailed: prov.emailed });
}

// Approve / reject a pending volunteer application. Approve provisions the account
// (temp password emailed via the welcome flow) and marks the request approved.
export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  let body: { id?: string; action?: "approve" | "reject" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!body.id || (body.action !== "approve" && body.action !== "reject")) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: req, error: getErr } = await admin
    .from("volunteer_requests")
    .select("id, user_id, status")
    .eq("id", body.id)
    .maybeSingle();
  if (getErr || !req) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (req.status !== "pending") return NextResponse.json({ error: "already_reviewed" }, { status: 409 });

  const reviewed = { reviewed_at: new Date().toISOString(), reviewed_by: gate.uid };
  const userId = req.user_id as string | null;

  if (body.action === "reject") {
    // The account was created at signup but never granted access — delete it on reject.
    if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {});
    await admin.from("volunteer_requests").update({ status: "rejected", ...reviewed }).eq("id", req.id);
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // Approve → the auth user already exists (created at signup with their own password);
  // granting access is just inserting the volunteer role row.
  if (!userId) return NextResponse.json({ error: "no_user" }, { status: 409 });
  const { error: roleErr } = await admin.from("admin_users").insert({ user_id: userId, role: "volunteer" });
  // Ignore a duplicate-role race (already granted); surface anything else.
  if (roleErr && !/duplicate|unique/i.test(roleErr.message)) {
    return NextResponse.json({ error: "role_failed", detail: roleErr.message }, { status: 400 });
  }
  await admin.from("volunteer_requests").update({ status: "approved", ...reviewed }).eq("id", req.id);
  return NextResponse.json({ ok: true, status: "approved" });
}

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  const admin = createAdminClient();

  // Pending applications branch.
  if (new URL(request.url).searchParams.get("requests")) {
    const { data, error } = await admin
      .from("volunteer_requests")
      .select("id, nombre, email, perfil, fuentes, telefono, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "list_failed" }, { status: 500 });
    return NextResponse.json({ requests: data ?? [] });
  }

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
