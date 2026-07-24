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

// ---------------------------------------------------------------- branding shell
// Shared frame for every outbound email: dark HelpMap header (logo + wordmark) and a
// footer with the domain and contact address. Two constraints shape it:
//   - Many clients (and Gmail on some accounts) block remote images by default, so the
//     wordmark is TEXT next to the logo — the brand still reads with images off.
//   - Outlook ignores flex/inline-block, so the header is a table, not divs.
// The logo is loaded from the public site (/ico.png) rather than attached inline: an
// embedded image raises spam score, and deliverability is already the weak link here.
const SITE_DEFAULT = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.helpmapvzla.net").replace(/\/+$/, "");

function emailShell(opts: { site?: string; preheader?: string; body: string }): string {
  const site = (opts.site || SITE_DEFAULT).replace(/\/+$/, "");
  return `
  <div style="background:#f2f3f5;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
    ${
      opts.preheader
        ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(
            opts.preheader,
          )}</div>`
        : ""
    }
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e8ec;border-radius:14px;overflow:hidden">
      <tr>
        <td style="background:#1c2233;padding:16px 20px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right:12px" valign="middle">
                <a href="${site}" style="text-decoration:none">
                  <img src="${site}/ico.png" width="40" height="40" alt="HelpMap"
                    style="display:block;width:40px;height:40px;border-radius:10px;border:0" />
                </a>
              </td>
              <td valign="middle">
                <a href="${site}" style="text-decoration:none;color:#ffffff">
                  <span style="display:block;font-size:16px;font-weight:700;letter-spacing:.2px;color:#ffffff">HelpMap Venezuela</span>
                  <span style="display:block;font-size:12px;color:#9aa3b4;margin-top:2px">Información para emergencias</span>
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:22px 24px 8px;color:#16191f">${opts.body}</td>
      </tr>
      <tr>
        <td style="padding:16px 24px 22px;border-top:1px solid #eef0f3">
          <p style="margin:0;color:#8b93a1;font-size:12px;line-height:1.6">
            <a href="${site}" style="color:#2563eb;text-decoration:none">helpmapvzla.net</a>
            &nbsp;·&nbsp;
            <a href="mailto:info@helpmapvzla.net" style="color:#2563eb;text-decoration:none">info@helpmapvzla.net</a>
            <br />
            Proyecto ciudadano sin fines de lucro. Datos confirmados en campo por contactos en centros de salud.
          </p>
        </td>
      </tr>
    </table>
  </div>`;
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
  const html = emailShell({
    preheader: `Nuevo mensaje de ${safeName} · ${kindLabel}`,
    body: `
    <h2 style="margin:0 0 10px;font-size:19px">Nuevo mensaje · ${kindLabel}</h2>
    <p style="margin:0 0 4px;color:#555;font-size:13px"><b>De:</b> ${escapeHtml(safeName)}${
      replyTo ? ` &lt;${escapeHtml(replyTo)}&gt;` : " (sin correo)"
    }</p>
    <div style="white-space:pre-wrap;font-size:14px;line-height:1.5;background:#f7f8f9;border:1px solid #ebecef;border-radius:10px;padding:14px 16px;margin-top:10px">${escapeHtml(
      opts.message,
    )}</div>`,
  });
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
  const html = emailShell({
    preheader: `Reporte de persona desaparecida: ${fullName}`,
    body: `
    <h2 style="margin:0 0 10px;font-size:19px">Reporte de persona desaparecida</h2>
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
    <p style="color:#888;font-size:12px;margin-top:14px">Revisa la pestaña <b>Reportes</b> del panel para gestionarlo.</p>`,
  });
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

// Onboarding email for a volunteer who just got access. Two shapes, one template:
//   - approved  → they signed up and set their OWN password (the main path today);
//                 we must NOT invent or echo a password.
//   - created   → an admin made the account by hand, so we ship a temp password.
// The manual itself lives in the public docs (/docs/manual-voluntario) rather than
// inside the email body: deliverability to external inboxes is still unreliable
// until SPF/DKIM/DMARC are set up, and a link survives a spam folder better than a
// wall of text nobody can re-find later.
export async function sendVolunteerWelcome(opts: {
  to: string;
  siteUrl: string;
  tempPassword?: string;
  name?: string;
}): Promise<boolean> {
  const site = opts.siteUrl.replace(/\/+$/, "");
  const loginUrl = `${site}/login`;
  const manualUrl = `${site}/docs/manual-voluntario`;
  const privacyUrl = `${site}/docs/privacidad`;
  const guideUrl = `${site}/docs/guia`;
  const greetName = cleanName(opts.name);
  const greeting = greetName ? `Hola ${escapeHtml(greetName)},` : "Hola,";

  const link = (href: string, title: string, desc: string) => `
    <a href="${href}" style="display:block;text-decoration:none;color:#16191f;border:1px solid #ebecef;border-radius:10px;padding:12px 14px;margin-bottom:8px">
      <span style="display:block;font-weight:700;font-size:14px">${title}</span>
      <span style="display:block;color:#666;font-size:13px;line-height:1.45;margin-top:2px">${desc}</span>
    </a>`;

  const credentials = opts.tempPassword
    ? `<div style="background:#f7f8f9;border:1px solid #ebecef;border-radius:12px;padding:14px 16px;margin:16px 0">
      <div style="font-size:13px;color:#555">Correo</div>
      <div style="font-size:15px;font-weight:700;margin-bottom:8px">${escapeHtml(opts.to)}</div>
      <div style="font-size:13px;color:#555">Contraseña temporal</div>
      <div style="font-size:15px;font-weight:700;font-family:monospace">${escapeHtml(opts.tempPassword)}</div>
      <div style="font-size:12px;color:#888;margin-top:10px">Cámbiala apenas entres.</div>
    </div>`
    : `<p style="color:#555;line-height:1.5;font-size:14px">
      Entra con <b>${escapeHtml(opts.to)}</b> y la contraseña que elegiste al postularte.
    </p>`;

  const html = emailShell({
    site,
    preheader: "Ya tienes acceso como voluntario/a. Empieza por el manual.",
    body: `
    <h2 style="margin:0 0 10px;font-size:20px">Bienvenido a HelpMap Venezuela</h2>
    <p style="color:#555;line-height:1.5;font-size:14px">
      ${greeting} ya tienes acceso como <b>voluntario/a</b>. Gracias por sumarte: cada dato
      que confirmas acerca a una familia a encontrar a los suyos.
    </p>
    <p style="color:#555;line-height:1.5;font-size:14px">
      Confiamos en ti, así que <b>lo que publicas se ve de inmediato</b> en el mapa — no pasa
      por una cola de revisión. Por eso te pedimos leer el manual antes de tu primer registro.
    </p>
    ${credentials}
    <a href="${loginUrl}" style="display:inline-block;background:#1c2233;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;font-size:14px;margin-bottom:18px">
      Iniciar sesión
    </a>
    <div style="font-size:13px;font-weight:700;color:#555;margin:8px 0 10px">Manuales</div>
    ${link(manualUrl, "Manual del voluntario", "Paso a paso del panel: cómo funciona la plataforma por dentro, hasta dónde llega tu acceso y las reglas que no se rompen. Empieza por aquí.")}
    ${link(privacyUrl, "Privacidad y manejo de datos", "Qué se muestra y qué no. Menores sin foto ni cédula, nunca.")}
    ${link(guideUrl, "Guía de uso de la app", "Cómo la usa una familia que busca a alguien.")}
    <p style="color:#888;font-size:12px;line-height:1.5;margin-top:18px">
      Dentro del panel, el botón <b>?</b> reabre el tour cuando lo necesites. ¿Dudas?
      Respóndenos a este correo o escribe a info@helpmapvzla.net.
      Si no esperabas este mensaje, ignóralo.
    </p>`,
  });
  return sendMail(opts.to, "Bienvenido/a · Acceso de voluntario en HelpMap Venezuela", html);
}
