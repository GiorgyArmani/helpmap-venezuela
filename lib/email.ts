import "server-only";
import nodemailer from "nodemailer";

// In-app email via SMTP (cPanel mailbox on mail.helpmapvzla.net). Credentials come
// from env — the password is NEVER hardcoded. If SMTP_PASS isn't configured the
// send helpers return false so callers degrade gracefully (e.g. the volunteer is
// still created, just without a welcome email).
//
// Env:
//   SMTP_HOST  (default mail.helpmapvzla.net)
//   SMTP_PORT  (default 465 — implicit TLS)
//   SMTP_USER  (default info@helpmapvzla.net)
//   SMTP_PASS  (required — the mailbox password)
//   SMTP_FROM  (default "HelpMap Venezuela <info@helpmapvzla.net>")

const HOST = process.env.SMTP_HOST || "mail.helpmapvzla.net";
const PORT = Number(process.env.SMTP_PORT || 465);
const USER = process.env.SMTP_USER || "info@helpmapvzla.net";
const PASS = process.env.SMTP_PASS || "";
const FROM = process.env.SMTP_FROM || `HelpMap Venezuela <${USER}>`;

let transporter: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter | null {
  if (!PASS) return null; // not configured → caller degrades gracefully
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: PORT === 465, // 465 = implicit TLS/SSL; 587 = STARTTLS (secure:false)
      auth: { user: USER, pass: PASS },
      // Fail fast instead of hanging ~22s when the port is blocked / unreachable.
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
      // cPanel/shared-hosting mail certs often don't match the mail.* hostname —
      // accept them so sending through the provider's own server still works.
      tls: { rejectUnauthorized: false },
    });
  }
  return transporter;
}

export function emailConfigured(): boolean {
  return !!PASS;
}

export async function sendMail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
  const tx = getTransport();
  if (!tx) return false;
  try {
    await tx.sendMail({
      from: FROM,
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    });
    return true;
  } catch (e) {
    console.error("[email] send failed:", e);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

// Turns a data URL (or raw base64) into a nodemailer attachment.
function toAttachment(dataUrl: string, i: number) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  const contentType = m?.[1] || "image/jpeg";
  const content = m ? m[2] : dataUrl;
  const ext = contentType.split("/")[1]?.split("+")[0] || "jpg";
  return { filename: `adjunto-${i + 1}.${ext}`, content, encoding: "base64" as const, contentType };
}

// Inbound contact message from an app user (text + optional image attachments).
// Goes to the team inbox; reply-to is the user's email (if valid) so the team can
// reply directly. Returns false if SMTP isn't configured.
export async function sendContactEmail(opts: {
  kind?: "volunteer" | "donation";
  name?: string;
  replyTo?: string;
  message: string;
  images?: string[];
}): Promise<boolean> {
  const tx = getTransport();
  if (!tx) return false;
  const to = process.env.CONTACT_TO || USER;
  const kindLabel =
    opts.kind === "volunteer" ? "Voluntariado" : opts.kind === "donation" ? "Donaciones" : "Contacto";
  const safeName = (opts.name || "Anónimo").slice(0, 120);
  const replyTo = opts.replyTo && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(opts.replyTo) ? opts.replyTo : undefined;
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#16191f">
    <h2 style="margin:0 0 10px">Nuevo mensaje · ${kindLabel}</h2>
    <p style="margin:0 0 4px;color:#555;font-size:13px"><b>De:</b> ${escapeHtml(safeName)}${
      replyTo ? ` &lt;${escapeHtml(replyTo)}&gt;` : " (sin correo)"
    }</p>
    <div style="white-space:pre-wrap;font-size:14px;line-height:1.5;background:#f7f8f9;border:1px solid #ebecef;border-radius:10px;padding:14px 16px;margin-top:10px">${escapeHtml(
      opts.message,
    )}</div>
  </div>`;
  try {
    await tx.sendMail({
      from: FROM,
      to,
      replyTo,
      subject: `[${kindLabel}] ${safeName} · HelpMap`,
      html,
      attachments: (opts.images || []).slice(0, 4).map(toAttachment),
    });
    return true;
  } catch (e) {
    console.error("[email] contact send failed:", e);
    return false;
  }
}

// Auto-acknowledgment sent back to a user who wrote to us through the in-app
// contact form. Reassures them the team received the message and will follow up.
// Best-effort: returns false (and the caller ignores it) if SMTP isn't configured
// or no valid reply address was supplied.
export async function sendContactAck(opts: {
  to: string;
  kind?: "volunteer" | "donation";
  name?: string;
}): Promise<boolean> {
  const to = opts.to;
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return false;
  const tx = getTransport();
  if (!tx) return false;
  const greetName = (opts.name || "").trim().slice(0, 80);
  const hi = greetName ? `Hola ${escapeHtml(greetName)},` : "Hola,";
  const intro =
    opts.kind === "volunteer"
      ? "Gracias por ofrecerte como voluntario/a en HelpMap Venezuela."
      : opts.kind === "donation"
        ? "Gracias por proponer tu iniciativa de donaciones a HelpMap Venezuela."
        : "Gracias por escribir a HelpMap Venezuela.";
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#16191f">
    <h2 style="margin:0 0 6px">¡Recibimos tu mensaje!</h2>
    <p style="color:#555;line-height:1.6;font-size:14px">${escapeHtml(hi)}</p>
    <p style="color:#555;line-height:1.6;font-size:14px">
      ${intro} <b>Estamos evaluando tu solicitud y nos pondremos en contacto contigo
      tan pronto como sea posible.</b>
    </p>
    <p style="color:#888;font-size:12px;line-height:1.6;margin-top:16px">
      Este es un mensaje automático de confirmación; no necesitas responderlo. Si no
      escribiste a HelpMap Venezuela, puedes ignorar este correo.
    </p>
  </div>`;
  return sendMail(to, "Recibimos tu mensaje · HelpMap Venezuela", html);
}

// Onboarding email for a newly created volunteer account.
export async function sendVolunteerWelcome(to: string, tempPassword: string, siteUrl: string): Promise<boolean> {
  const loginUrl = `${siteUrl.replace(/\/+$/, "")}/login`;
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#16191f">
    <h2 style="margin:0 0 6px">Bienvenido a HelpMap Venezuela</h2>
    <p style="color:#555;line-height:1.5;font-size:14px">
      Se te ha dado acceso como <b>voluntario/a</b>. Con tu cuenta puedes subir fotos de
      listas de pacientes y registrar/editar personas. Tus aportes pasan por revisión del
      equipo antes de publicarse.
    </p>
    <div style="background:#f7f8f9;border:1px solid #ebecef;border-radius:12px;padding:14px 16px;margin:16px 0">
      <div style="font-size:13px;color:#555">Correo</div>
      <div style="font-size:15px;font-weight:700;margin-bottom:8px">${to}</div>
      <div style="font-size:13px;color:#555">Contraseña temporal</div>
      <div style="font-size:15px;font-weight:700;font-family:monospace">${tempPassword}</div>
    </div>
    <a href="${loginUrl}" style="display:inline-block;background:#15181d;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:14px">
      Iniciar sesión
    </a>
    <p style="color:#888;font-size:12px;line-height:1.5;margin-top:16px">
      Por seguridad, cambia tu contraseña después de iniciar sesión. Si no esperabas este
      correo, ignóralo.
    </p>
  </div>`;
  return sendMail(to, "Acceso de voluntario · HelpMap Venezuela", html);
}
