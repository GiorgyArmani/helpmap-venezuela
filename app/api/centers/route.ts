import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Feedback loop for locations (CLAUDE.md §13 → DB-driven locations). When an admin
// adds/edits/deletes a center in the app, we POST it to an n8n webhook so the workflow
// can keep its intake LISTS dropdown + dedup alias/loc maps in sync — the app becomes a
// source that updates the workflow instead of drifting from it.
//
// Staff-only (admin OR volunteer). Forwards to N8N_CENTERS_WEBHOOK_URL (server-side
// only). The Supabase upsert/delete still happens client-side via the authenticated
// session; this route only mirrors the change to n8n and never blocks that write.
// Volunteers can add/edit centers (delete stays admin-only, enforced by RLS + UI).

async function requireStaff() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false as const, status: 401, email: null };
  const { data: role } = await supabase.from("admin_users").select("role").eq("user_id", uid).maybeSingle();
  if (role?.role !== "admin" && role?.role !== "volunteer")
    return { ok: false as const, status: 403, email: null };
  return { ok: true as const, email: auth.user?.email ?? uid };
}

export async function POST(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  const webhook = process.env.N8N_CENTERS_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ error: "centers_not_configured" }, { status: 503 });

  let body: { action?: string; center?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!body.center) return NextResponse.json({ error: "missing_center" }, { status: 422 });

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "center_upsert",
        action: body.action ?? "upserted", // created | updated | deleted
        center: body.center,
        updated_by: gate.email,
        received_at: new Date().toISOString(),
        source: "admin_web",
      }),
    });
    if (!res.ok) return NextResponse.json({ error: "upstream", status: res.status }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "upstream_unreachable" }, { status: 502 });
  }
}
