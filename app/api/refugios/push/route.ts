import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { ACOPIOVE_API, ACOPIOVE_SOURCE_NAME } from "@/lib/acopiove";

// Push a HelpMap staff edit BACK to AcopioVE as a moderated suggestion
// (POST /submissions — "contribución de terceros"). This is how the two apps improve
// each other: whoever has the fresher data offers it upstream. It is a SUGGESTION, not a
// direct overwrite — AcopioVE reviews it (201 = queued; may flag possible_duplicate).
//
// Guardrails: (1) STAFF-gated (is_staff via cookie session — no service_role).
// (2) OFF by default — set ACOPIOVE_PUSH_ENABLED=1 to enable, so we never silently write
// to a third party until the team turns it on. Best-effort: never blocks the local save.

async function requireStaff() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false as const, status: 401 };
  const { data: role } = await supabase.from("admin_users").select("role").eq("user_id", uid).maybeSingle();
  if (role?.role !== "admin" && role?.role !== "volunteer") return { ok: false as const, status: 403 };
  return { ok: true as const };
}

export async function POST(request: Request) {
  if (process.env.ACOPIOVE_PUSH_ENABLED !== "1")
    return NextResponse.json({ ok: false, disabled: true }, { status: 200 });

  const gate = await requireStaff();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  let body: {
    tipo?: "refugio" | "acopio";
    external_id?: string | null;
    name?: string;
    estado?: string | null;
    address?: string | null;
    ciudad?: string | null;
    lat?: number;
    lng?: number;
    recibe?: string[];
    necesita_ahora?: string | null;
    horario?: string | null;
    contacto?: string | null;
    responsable?: string | null;
    fuente?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!body.name || typeof body.lat !== "number" || typeof body.lng !== "number")
    return NextResponse.json({ error: "missing_fields" }, { status: 422 });

  // Matches the /submissions request schema (tipo enum acopio|refugio, estado enum
  // abierto|lleno|cerrado). We pass the record's UUID so AcopioVE can match it to the
  // existing centro, and `source` for CC-BY attribution of our contribution.
  const payload = {
    id: body.external_id || undefined,
    name: body.name,
    tipo: body.tipo === "acopio" ? "acopio" : "refugio",
    // Only sent when we actually know it (abierto|lleno|cerrado). It used to default to
    // "abierto", which could have suggested a CLOSED point back open upstream — the one
    // direction of this field that causes harm.
    ...(body.estado ? { estado: body.estado } : {}),
    address: body.address ?? null,
    ciudad: body.ciudad ?? null,
    pais: "Venezuela",
    lat: body.lat,
    lng: body.lng,
    recibe: body.recibe ?? [],
    necesita_ahora: body.necesita_ahora ?? null,
    horario: body.horario ?? null,
    contacto: body.contacto ?? null,
    responsable: body.responsable ?? null,
    fuente: body.fuente ?? "HelpMap VE",
    updated_at: new Date().toISOString(),
    source: ACOPIOVE_SOURCE_NAME,
  };

  try {
    const res = await fetch(ACOPIOVE_API + "/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok, status: res.status, data }, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ error: "acopiove_unreachable" }, { status: 502 });
  }
}
