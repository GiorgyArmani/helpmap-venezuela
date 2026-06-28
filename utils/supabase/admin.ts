import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client — SERVER-ONLY. NEVER import this from client code.
// The `server-only` import makes a client bundle that touches this file fail to
// build, so the service_role key can't leak.
//
// CLAUDE.md §12 reserves the public app from the service_role key. Creating
// volunteer accounts is an explicit, team-approved exception that runs only in a
// trusted server route AFTER the caller is verified as an admin (see
// app/api/admin/volunteers/route.ts). Use this for nothing else without sign-off.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createAdminClient() {
  if (!url || !serviceKey) throw new Error("service_role not configured");
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
