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
      secure: PORT === 465, // 465 = implicit TLS/SSL
      auth: { user: USER, pass: PASS },
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
