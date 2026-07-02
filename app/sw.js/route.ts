import { readFileSync } from "node:fs";
import path from "node:path";
import { swSource } from "@/lib/swSource";

// Serve the service worker with a per-build CACHE_VERSION baked in, so the SW
// bytes change on every deploy → the browser reinstalls it → stale app-shell /
// static caches are discarded and the CODE stays fresh (while the DATA cache
// keeps working offline). Replaces the old static /public/sw.js, which was
// byte-identical across deploys and had to be version-bumped by hand.

export const dynamic = "force-static"; // identical for the whole build; recomputed each deploy

// Evaluated once per server process — a deploy always restarts the process, so
// even if BUILD_ID can't be read this still changes on every deploy.
const BOOT_VERSION = "b" + Date.now().toString(36);

function cacheVersion(): string {
  try {
    return readFileSync(path.join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim() || BOOT_VERSION;
  } catch {
    return BOOT_VERSION;
  }
}

export function GET() {
  return new Response(swSource(cacheVersion()), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // The SW itself must never be HTTP-cached, so a new version is always
      // picked up on the next visit (updateViaCache:"none" also enforces this).
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
