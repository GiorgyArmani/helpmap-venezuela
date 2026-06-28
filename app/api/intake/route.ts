import { NextResponse } from "next/server";

// Public intake endpoint. The browser (online or flushing its offline queue)
// POSTs a submission here; we forward it to the n8n INTAKE webhook for cleanup
// and human verification. NEVER writes to the database (CLAUDE.md §7).
// The webhook URL is server-side only and never exposed to the client.

export async function POST(request: Request) {
  const webhook = process.env.N8N_UPLOAD_WEBHOOK_URL;
  if (!webhook) {
    // Not configured yet — tell the client to keep the item queued and retry.
    return NextResponse.json({ error: "intake_not_configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  if (!b.nombres && !b.apellidos) {
    return NextResponse.json({ error: "missing_name" }, { status: 422 });
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...b, received_at: new Date().toISOString(), source: b.source ?? "web" }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "upstream", status: res.status }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "upstream_unreachable" }, { status: 502 });
  }
}
