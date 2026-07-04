import "server-only";
import nodemailer from "nodemailer";
import { cleanName } from "@/lib/sanitize";

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
  suspicious?: boolean; // heuristic flag → subject prefix so the team can filter it
}): Promise<boolean> {
  const tx = getTransport();
  if (!tx) return false;
  const to = process.env.CONTACT_TO || USER;
  const kindLabel =
    opts.kind === "volunteer" ? "Voluntariado" : opts.kind === "donation" ? "Donaciones" : "Contacto";
  const safeName = cleanName(opts.name) || "Anónimo";
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
      subject: `${opts.suspicious ? "[POSIBLE SPAM] " : ""}[${kindLabel}] ${safeName} · HelpMap`,
      html,
      attachments: (opts.images || []).slice(0, 4).map(toAttachment),
    });
    return true;
  } catch (e) {
    console.error("[email] contact send failed:", e);
    return false;
  }
}

// NOTE: there is intentionally NO auto-acknowledgment email to the sender. Echoing a
// user-supplied address+name into an email from our own domain let attackers use us as
// a phishing relay (see app/api/contact/route.ts). Contact confirmation is IN-APP only.

// Missing-person report from a family/citizen (the public "Reportar desaparecido" flow).
// Goes to the team inbox so it lands "al mail y a la app" alongside the DB queue row
// (missing_reports). reply-to = the reporter's contact ONLY if it's a valid email, so the
// team can reply directly. All fields are pre-sanitized by the route; escaped again here.
export async function sendReportEmail(opts: {
  apellidos?: string;
  nombres?: string;
  ci?: string | null;
  edad?: number | null;
  zona?: string | null;
  descripcion?: string | null;
  reporterName?: string;
  reporterContact?: string | null;
}): Promise<boolean> {
  const tx = getTransport();
  if (!tx) return false;
  const to = process.env.CONTACT_TO || USER;
  const fullName = `${cleanName(opts.nombres)} ${cleanName(opts.apellidos)}`.trim() || "Sin nombre";
  const reporter = cleanName(opts.reporterName) || "Anónimo";
  const contact = (opts.reporterContact || "").trim();
  const replyTo = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact) ? contact : undefined;
  const row = (label: string, value: string) =>
    `<p style="margin:0 0 4px;font-size:14px"><b style="color:#555">${label}:</b> ${escapeHtml(value)}</p>`;
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#16191f">
    <h2 style="margin:0 0 10px">Reporte de persona desaparecida</h2>
    ${row("Persona buscada", fullName)}
    ${opts.ci ? row("Cédula", opts.ci) : ""}
    ${opts.edad != null ? row("Edad", String(opts.edad)) : ""}
    ${opts.zona ? row("Última zona conocida", opts.zona) : ""}
    ${opts.descripcion ? `<div style="white-space:pre-wrap;font-size:14px;line-height:1.5;background:#f7f8f9;border:1px solid #ebecef;border-radius:10px;padding:12px 14px;margin:10px 0">${escapeHtml(
      opts.descripcion,
    )}</div>` : ""}
    <hr style="border:none;border-top:1px solid #ebecef;margin:14px 0" />
    ${row("Reporta", reporter)}
    ${contact ? row("Contacto", contact) : ""}
    <p style="color:#888;font-size:12px;margin-top:14px">Revisa la pestaña <b>Reportes</b> del panel para gestionarlo.</p>
  </div>`;
  try {
    await tx.sendMail({
      from: FROM,
      to,
      replyTo,
      subject: `[Reporte desaparecido] ${fullName} · HelpMap`,
      html,
    });
    return true;
  } catch (e) {
    console.error("[email] report send failed:", e);
    return false;
  }
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
