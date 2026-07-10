"use client";

// Password-recovery landing page. Supabase's recovery email redirects here (the
// `redirect_to` in resetPasswordForEmail below points at `${origin}/auth/reset`).
// By the time the user lands, Supabase has handed us a short-lived recovery session
// — either as a `?code=` to exchange (PKCE flow) or as tokens in the URL hash that
// the browser client auto-detects (detectSessionInUrl). We then let them set a new
// password via updateUser().
//
// Dashboard requirement (see the reset flow notes): Site URL must be the production
// domain and `/auth/reset` must be in the Redirect URLs allowlist, or the email link
// keeps pointing at localhost.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Phase = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let active = true;

    // Supabase fires PASSWORD_RECOVERY once it establishes the recovery session
    // from the email link (hash flow). Belt-and-suspenders with the checks below.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setPhase("ready");
    });

    (async () => {
      const url = new URL(window.location.href);
      if (url.searchParams.get("error_description")) {
        if (active) setPhase("invalid");
        return;
      }
      // PKCE flow: exchange the code for the recovery session.
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (active) setPhase(error ? "invalid" : "ready");
        return;
      }
      // Hash flow: detectSessionInUrl already parsed the tokens — check for a session.
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setPhase("ready");
      } else {
        // Give onAuthStateChange a moment; if still nothing, the link is bad/expired.
        setTimeout(() => {
          if (active) setPhase((p) => (p === "checking" ? "invalid" : p));
        }, 1800);
      }
    })();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setErr("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setErr("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPhase("done");
      setTimeout(() => router.push("/"), 2500);
    } catch {
      setErr("No se pudo actualizar la contraseña. El enlace pudo expirar; solicita uno nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.brand}>
          <span style={S.logo} />
          <span style={S.brandName}>HelpMap Venezuela</span>
        </div>

        {phase === "checking" && (
          <>
            <h1 style={S.h1}>Verificando enlace…</h1>
            <p style={S.p}>Un momento, estamos validando tu enlace de recuperación.</p>
          </>
        )}

        {phase === "invalid" && (
          <>
            <h1 style={S.h1}>Enlace no válido</h1>
            <p style={S.p}>
              Este enlace de recuperación expiró o ya fue usado. Solicita uno nuevo desde la
              pantalla de inicio de sesión.
            </p>
            <Link href="/login" style={S.btnLink}>
              Solicitar un enlace nuevo
            </Link>
            <Link href="/" style={S.back}>
              ← Volver al mapa
            </Link>
          </>
        )}

        {phase === "done" && (
          <>
            <h1 style={S.h1}>Contraseña actualizada</h1>
            <p style={S.p}>Listo. Ya puedes usar tu nueva contraseña. Redirigiéndote…</p>
            <Link href="/" style={S.btnLink}>
              Ir al mapa
            </Link>
          </>
        )}

        {phase === "ready" && (
          <form onSubmit={submit}>
            <h1 style={S.h1}>Nueva contraseña</h1>
            <p style={S.p}>Escribe tu nueva contraseña para tu cuenta de HelpMap.</p>

            <label style={S.label}>Nueva contraseña</label>
            <input
              style={S.input}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 8 caracteres"
            />

            <label style={S.label}>Repetir contraseña</label>
            <input
              style={S.input}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
            />

            {err && <div style={S.err}>{err}</div>}

            <button style={S.btn} type="submit" disabled={busy || !password || !confirm}>
              {busy ? "…" : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f8f9", padding: 20, fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif" },
  card: { width: "100%", maxWidth: 380, background: "#fff", border: "1px solid #ebecef", borderRadius: 18, padding: 24, boxShadow: "0 10px 34px rgba(16,20,28,.10)", display: "flex", flexDirection: "column" },
  brand: { display: "flex", alignItems: "center", gap: 9, marginBottom: 16 },
  logo: { width: 26, height: 26, borderRadius: 8, background: "radial-gradient(circle at 50% 38%,#fff 0 3px,transparent 4px),#15181d" },
  brandName: { fontSize: 14, fontWeight: 700, letterSpacing: "-.3px", color: "#16191f" },
  h1: { fontSize: 20, fontWeight: 700, letterSpacing: "-.3px", margin: "0 0 6px", color: "#16191f" },
  p: { fontSize: 12.5, color: "#7b818c", lineHeight: 1.5, margin: "0 0 8px" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#7b818c", margin: "12px 0 6px" },
  input: { width: "100%", border: "1px solid #ebecef", borderRadius: 11, padding: "13px 12px", fontSize: 16, fontFamily: "inherit", outline: "none", background: "#fff", color: "#16191f", boxSizing: "border-box" },
  err: { marginTop: 14, fontSize: 12.5, fontWeight: 600, borderRadius: 10, padding: "10px 12px", lineHeight: 1.4, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" },
  btn: { marginTop: 18, width: "100%", background: "#15181d", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  btnLink: { display: "block", textAlign: "center", marginTop: 18, background: "#15181d", color: "#fff", textDecoration: "none", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600 },
  back: { display: "block", width: "100%", marginTop: 16, fontSize: 12.5, color: "#7b818c", textDecoration: "none", textAlign: "center" },
};
