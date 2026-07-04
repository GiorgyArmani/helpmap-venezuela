import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Staff (admin/volunteer) upload a PHOTO of a handwritten patient list. On-site the
// lists are often handwritten (urgency / no power or computers). We forward the image
// to an n8n listener webhook that OCRs it and feeds the normal INTAKE funnel — this
// route NEVER writes to the DB (same posture as /api/intake, CLAUDE.md §7). The
// webhook URL is server-side only and never exposed to the client.

async function requireStaff() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false as const, status: 401 };
  const { data: role } = await supabase.from("admin_users").select("role").eq("user_id", user.id).maybeSingle();
  if (role?.role !== "admin" && role?.role !== "volunteer") return { ok: false as const, status: 403 };
  return { ok: true as const, user };
}

export async function POST(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  const webhook = process.env.N8N_LISTS_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json({ error: "lists_not_configured" }, { status: 503 });
  }

  let body: { image_b64?: string; filename?: string; note?: string; location_id?: string; data_date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!body.image_b64) {
    return NextResponse.json({ error: "missing_image" }, { status: 422 });
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "patient_list_photo",
        image_b64: body.image_b64,
        filename: body.filename ?? null,
        note: body.note ?? null,
        location_id: body.location_id ?? null,
        // Date the list CORRESPONDS to (yyyy-mm-dd) — distinct from received_at
        // (when it was uploaded). On-site lists are often reported days later.
        data_date: body.data_date ?? null,
        uploaded_by: gate.user.email ?? gate.user.id,
        received_at: new Date().toISOString(),
        source: "volunteer_web",
      }),
    });
    if (!res.ok) {
      // Surface WHAT n8n returned so a 502 is diagnosable (e.g. 404 = webhook not
      // registered → workflow not activated or wrong/test URL; 500 = a node failed).
      const detail = await res.text().catch(() => "");
      console.error(`[lists] upstream ${res.status} from n8n:`, detail.slice(0, 500));
      return NextResponse.json({ error: "upstream", status: res.status }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[lists] upstream unreachable:", e);
    return NextResponse.json({ error: "upstream_unreachable" }, { status: 502 });
  }
}
