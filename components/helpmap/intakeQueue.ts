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
  contacto: string | null;
  lang: string;
  source: "web";
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
  try {
    const res = await fetch("/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
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
