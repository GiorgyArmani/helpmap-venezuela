// Real share helpers. Per CLAUDE.md §5: WhatsApp/Telegram have URL share intents;
// Instagram does not — fall back to copy-link + "paste in your story" guidance.

export function patientPath(id: string) {
  return `/p/${id}`;
}

export function patientUrl(id: string) {
  if (typeof window === "undefined") return patientPath(id);
  return window.location.origin + patientPath(id);
}

export function shareText(name: string, statusLabel: string, locationName: string) {
  return `${name} — ${statusLabel} · ${locationName} · HelpMap Venezuela`;
}

export function whatsappUrl(url: string, text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`;
}

export function telegramUrl(url: string, text: string) {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function openShare(href: string) {
  if (typeof window !== "undefined") window.open(href, "_blank", "noopener,noreferrer");
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// Native OS share sheet (mobile) — shows WhatsApp/Instagram/Telegram directly.
// Returns false if unsupported or cancelled so callers can fall back.
export async function nativeShare(opts: { title: string; text: string; url: string }): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share(opts);
      return true;
    }
  } catch {
    /* user cancelled or share failed */
  }
  return false;
}
