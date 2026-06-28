"use client";

// Admin sign-in route. Unlike /signup (local-only, creates accounts), this page
// is committed and used to log in. On success the Supabase session persists and
// the admin gear appears on the map.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setErr("Credenciales inválidas.");
      } else {
        router.push("/");
      }
    } catch {
      setErr("No se pudo iniciar sesión. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={S.wrap}>
      <form style={S.card} onSubmit={signIn}>
        <div style={S.brand}>
          <span style={S.logo} />
          <span style={S.brandName}>HelpMap Venezuela</span>
        </div>
        <h1 style={S.h1}>Iniciar sesión</h1>
        <p style={S.p}>Acceso para el equipo de administración.</p>

        <label style={S.label}>Correo</label>
        <input
          style={S.input}
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@helpmapve.net"
        />

        <label style={S.label}>Contraseña</label>
        <input
          style={S.input}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        {err && <div style={S.err}>{err}</div>}

        <button style={S.btn} type="submit" disabled={busy || !email || !password}>
          {busy ? "…" : "Iniciar sesión"}
        </button>

        <Link href="/" style={S.back}>
          ← Volver al mapa
        </Link>
      </form>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f8f9", padding: 20, fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif" },
  card: { width: "100%", maxWidth: 380, background: "#fff", border: "1px solid #ebecef", borderRadius: 18, padding: 24, boxShadow: "0 10px 34px rgba(16,20,28,.10)", display: "flex", flexDirection: "column" },
  brand: { display: "flex", alignItems: "center", gap: 9, marginBottom: 16 },
  logo: { width: 26, height: 26, borderRadius: 8, background: "radial-gradient(circle at 50% 38%,#fff 0 3px,transparent 4px),#15181d" },
  brandName: { fontSize: 14, fontWeight: 700, letterSpacing: "-.3px", color: "#16191f" },
  h1: { fontSize: 20, fontWeight: 700, letterSpacing: "-.3px", margin: "0 0 6px", color: "#16191f" },
  p: { fontSize: 12.5, color: "#7b818c", lineHeight: 1.5, margin: "0 0 8px" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#7b818c", margin: "12px 0 6px" },
  input: { width: "100%", border: "1px solid #ebecef", borderRadius: 11, padding: "13px 12px", fontSize: 14, fontFamily: "inherit", outline: "none", background: "#fff", color: "#16191f", boxSizing: "border-box" },
  err: { marginTop: 14, fontSize: 12.5, fontWeight: 600, borderRadius: 10, padding: "10px 12px", lineHeight: 1.4, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" },
  btn: { marginTop: 18, background: "#15181d", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  back: { display: "inline-block", marginTop: 16, fontSize: 12.5, color: "#7b818c", textDecoration: "none", textAlign: "center" },
};
