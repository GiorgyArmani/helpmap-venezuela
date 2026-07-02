import { NextResponse } from "next/server";
import { clientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";

// Public intake endpoint. The browser (online or flushing its offline queue)
// POSTs a submission here; we forward it to the n8n INTAKE webhook for cleanup
// and human verification. NEVER writes to the database (CLAUDE.md §7).
// The webhook URL is server-side only and never exposed to the client.

// Per-IP flood guard. Kept generous because a browser flushing its OFFLINE QUEUE may
// legitimately POST several queued submissions back-to-back after reconnecting.
const RATE_LIMIT = 20; // requests per window per IP
const RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const rl = rateLimit(`intake:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: rl.retryAfter },
      { status: 429, headers: { ...rateLimitHeaders(rl), "Retry-After": String(rl.retryAfter) } },
    );
  }

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

  // DEBUG: assert the photo travels as `foto_url` (matches the DB column) and
  // that the legacy `foto_path` is gone. Remove once verified end-to-end.
  console.log("[intake] payload recibido:", {
    nombres: b.nombres,
    apellidos: b.apellidos,
    foto_url: b.foto_url ?? null,
    foto_path_present: "foto_path" in b, // debe ser false
  });
  if ("foto_path" in b) {
    console.warn("[intake] ⚠️ llegó foto_path — debería ser foto_url. Revisar cliente.");
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...b, received_at: new Date().toISOString(), source: b.source ?? "web" }),
    });
    if (!res.ok) {
      // Surface WHAT n8n returned so a 502 is diagnosable (e.g. 404 = webhook not
      // registered → workflow not activated or a Test URL used instead of the
      // Production URL; 500 = a node failed inside the workflow).
      const detail = await res.text().catch(() => "");
      console.error(`[intake] upstream ${res.status} from n8n:`, detail.slice(0, 500));
      return NextResponse.json({ error: "upstream", status: res.status }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[intake] upstream unreachable:", e);
    return NextResponse.json({ error: "upstream_unreachable" }, { status: 502 });
  }
}
