// Real share helpers. Per CLAUDE.md §5: WhatsApp/Telegram have URL share intents;
// Instagram does not — fall back to copy-link + "paste in your story" guidance.

export function patientPath(id: string) {
  return `/p/${id}`;
}

export function patientUrl(id: string) {
  if (typeof window === "undefined") return patientPath(id);
  return window.location.origin + patientPath(id);
}

// Per-center (refugio / centro de acopio) shareable page — same SSR + OG-card + story
// system as patients, so a help point's need renders a preview card in WhatsApp/Telegram
// and can be posted as an Instagram story (CLAUDE.md §5).
export function centerPath(id: string) {
  return `/c/${id}`;
}

export function centerUrl(id: string) {
  if (typeof window === "undefined") return centerPath(id);
  return window.location.origin + centerPath(id);
}

export function shareText(name: string, statusLabel: string, locationName: string) {
  return `${name} · ${statusLabel} · ${locationName} · HelpMap Venezuela`;
}

// Google Maps directions to a center's coordinates ("Cómo llegar"). Works on web
// and deep-links into the Maps app on mobile.
export function mapsDirectionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
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

// Generates the patient story banner (1080×1920 PNG via /p/[id]/story) and hands
// it to the native share sheet as a FILE — on mobile the user can then pick
// Instagram → Story/Chat (the only way to reach IG stories; IG has no web share
// intent). Falls back to downloading the image when file-share is unsupported.
export type StoryShareResult = "shared" | "downloaded" | "error";

// Generic: fetch a server-generated PNG at `storyUrl` and hand it to the native
// share sheet as a FILE (mobile → Instagram Story), else open it for manual saving.
async function shareImageFile(storyUrl: string, fileName: string, title: string): Promise<StoryShareResult> {
  // Native share sheet ONLY on phones/tablets — there it lets the user pick
  // Instagram → Story. On desktop the OS "Share" dialog is unwanted (the user
  // just wants the image to save and post manually), so we skip it.
  const touchDevice =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(pointer: coarse)").matches || (navigator.maxTouchPoints ?? 0) > 0);

  if (touchDevice) {
    try {
      const res = await fetch(storyUrl);
      if (res.ok && typeof navigator !== "undefined" && typeof navigator.canShare === "function") {
        const blob = await res.blob();
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare({ files: [file] }) && typeof navigator.share === "function") {
          try {
            await navigator.share({ files: [file], title });
            return "shared";
          } catch {
            /* user cancelled or activation lost → fall through to opening it */
          }
        }
      }
    } catch {
      /* fall through to the universal fallback */
    }
  }

  // Desktop, and mobile fallback: open the generated PNG in a new tab. The user
  // saves it (right-click on desktop / long-press on iOS where `<a download>` is
  // ignored) and uploads it to their Instagram story.
  if (typeof window !== "undefined") {
    window.open(storyUrl, "_blank", "noopener,noreferrer");
    return "downloaded";
  }
  return "error";
}

export async function shareStoryImage(id: string, title: string): Promise<StoryShareResult> {
  return shareImageFile(patientPath(id) + "/story", `helpmap-${id}.png`, title);
}

// Same story-image flow for a help point (refugio / centro de acopio).
export async function shareCenterStoryImage(id: string, title: string): Promise<StoryShareResult> {
  return shareImageFile(centerPath(id) + "/story", `helpmap-centro-${id}.png`, title);
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
