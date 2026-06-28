import { NextResponse } from "next/server";
import { sendContactEmail, sendContactAck } from "@/lib/email";

// Public "write to us" endpoint: an app user sends a message (+ optional images)
// which we email to the team inbox via nodemailer. No DB writes. Basic guards only
// (required message, max 4 images); images should already be compressed client-side.

export async function POST(request: Request) {
  let body: { kind?: string; name?: string; email?: string; message?: string; images?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const message = (body.message || "").trim();
  if (message.length < 2) return NextResponse.json({ error: "missing_message" }, { status: 422 });

  const images = Array.isArray(body.images)
    ? body.images.filter((x): x is string => typeof x === "string").slice(0, 4)
    : [];
  const kind = body.kind === "volunteer" || body.kind === "donation" ? body.kind : undefined;

  const ok = await sendContactEmail({
    kind,
    name: body.name,
    replyTo: body.email,
    message: message.slice(0, 5000),
    images,
  });
  if (!ok) return NextResponse.json({ error: "email_unavailable" }, { status: 502 });

  // Auto-acknowledgment back to the user. We AWAIT it (rather than fire-and-forget)
  // so the send actually completes before the handler returns — otherwise the
  // request can finish and tear down the async work mid-flight, and the user never
  // gets the email. A failure here still must NOT fail the response: the team email
  // already went through, which is what matters.
  if (typeof body.email === "string" && body.email.trim()) {
    try {
      const ackOk = await sendContactAck({ to: body.email.trim(), kind, name: body.name });
      if (!ackOk) console.warn("[contact] ack email not sent (invalid address or SMTP unavailable):", body.email);
    } catch (e) {
      console.error("[contact] ack email error:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
