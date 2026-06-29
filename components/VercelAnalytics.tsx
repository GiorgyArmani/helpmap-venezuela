"use client";

import { Analytics } from "@vercel/analytics/next";

// Privacy-preserving Vercel Web Analytics for HelpMap.
//
// CLAUDE.md §2/§11: we must never record WHICH person is being looked up. Patient
// pages live at /p/<uuid>, so a raw pageview would leak the identity of searched
// individuals (a deanonymization / targeting signal). `beforeSend` runs in the
// browser before any event leaves the device: we strip the id so we keep an
// aggregate "a patient page was viewed" count without ever logging which one.
//
// Search terms are NOT a concern here — search is local component state and never
// appears in the URL, and we send no custom events.
export default function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        try {
          const u = new URL(event.url);
          if (u.pathname.startsWith("/p/")) {
            u.pathname = "/p/[id]"; // redact the patient id
            u.search = ""; // drop any query string too
            return { ...event, url: u.toString() };
          }
        } catch {
          /* malformed url — fall through and send as-is */
        }
        return event;
      }}
    />
  );
}
