// Offline-first intake queue. Submissions from the public "Subir info" form are
// stored locally and POSTed to /api/intake (which forwards to the n8n INTAKE
// webhook). If there is no connection, items stay queued and are retried when
// the connection returns. Nothing here ever touches the database (CLAUDE.md §7).

export interface IntakeSubmission {
  id: string;
  createdAt: string;
  apellidos: string;
  nombres: string;
  ci: string; // "MENOR" for minors
  is_minor: boolean;
  edad: number | null;
  sexo: "M" | "F" | null;
  location_id: string;
  location_name: string;
  estatus: string;
  // Home origin / neighborhood. Admin-only — collected at intake for the team,
  // NEVER shown publicly (CLAUDE.md §2; the patients_public view strips it).
  procedencia: string | null;
  // Date the information CORRESPONDS to (ISO yyyy-mm-dd), as reported by the
  // submitter. Distinct from `createdAt` (when it was uploaded) — on-site data is
  // often reported days after the fact, so the team needs the real data date to
  // judge freshness. null when not provided.
  data_date: string | null;
  contacto: string | null;
  lang: string;
  source: "web";
  // Photo (adults only). `foto_b64` is the compressed image held LOCALLY until a
  // connection lets us upload it; it is NEVER sent to n8n. `foto_url` is the
  // bucket object's public URL produced by the upload — this is the field the DB
  // (column `foto_url`) and the n8n spreadsheet expect. There is no `foto_path`.
  foto_b64?: string | null;
  foto_url?: string | null;
}

const KEY = "helpmap:intake-queue:v1";

function read(): IntakeSubmission[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as IntakeSubmission[]) : [];
  } catch {
    return [];
  }
}

function write(list: IntakeSubmission[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full — non-fatal */
  }
}

export function queueCount(): number {
  return read().length;
}

export function enqueue(sub: IntakeSubmission) {
  const list = read();
  list.push(sub);
  write(list);
}

async function send(sub: IntakeSubmission): Promise<"sent" | "drop" | "keep"> {
  // Upload the photo first (online only). On a definitive failure we proceed
  // without the photo rather than blocking the reunification text forever; on a
  // network failure we keep the item queued and retry later.
  if (sub.foto_b64 && !sub.foto_url && !sub.is_minor) {
    try {
      const { uploadIntakePhoto } = await import("./uploadPhoto");
      sub.foto_url = await uploadIntakePhoto(sub.foto_b64);
      sub.foto_b64 = null;
      // Persist progress so a later send doesn't re-upload.
      write(read().map((x) => (x.id === sub.id ? sub : x)));
      console.debug("[intake] foto subida → foto_url:", sub.foto_url);
    } catch (e) {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return "keep";
      // Online but upload failed (bad file / policy): drop the photo, keep text.
      console.warn("[intake] fallo al subir la foto, se envía sin foto:", e);
      sub.foto_b64 = null;
    }
  }

  // Never forward the raw image binary to n8n — only the public URL (foto_url).
  const { foto_b64: _omit, ...payload } = sub;
  void _omit;

  // DEBUG: confirm the payload carries foto_url (a URL) and NOT foto_path.
  console.debug("[intake] POST /api/intake →", {
    id: payload.id,
    foto_url: payload.foto_url ?? null,
    foto_path_present: "foto_path" in payload, // must be false
  });

  try {
    const res = await fetch("/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return "sent";
    // 4xx = the payload itself is invalid; it will never succeed, so drop it.
    if (res.status >= 400 && res.status < 500) return "drop";
    // 5xx / not-configured: keep and retry later.
    return "keep";
  } catch {
    // Network failure (offline): keep and retry later.
    return "keep";
  }
}

export interface FlushResult {
  sent: number;
  dropped: number;
  remaining: number;
}

let flushing = false;

// Attempts to send every queued item. Stops at the first "keep" (e.g. offline)
// so we don't hammer the network; the rest are retried on the next trigger.
export async function flushQueue(): Promise<FlushResult> {
  if (flushing) return { sent: 0, dropped: 0, remaining: queueCount() };
  flushing = true;
  let sent = 0;
  let dropped = 0;
  try {
    let list = read();
    while (list.length) {
      const item = list[0];
      const result = await send(item);
      if (result === "keep") break;
      if (result === "sent") sent++;
      if (result === "drop") dropped++;
      list = read().filter((x) => x.id !== item.id);
      write(list);
    }
    return { sent, dropped, remaining: read().length };
  } finally {
    flushing = false;
  }
}
