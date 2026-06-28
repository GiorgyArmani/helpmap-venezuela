import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Spec (CLAUDE.md §12) names this NEXT_PUBLIC_SUPABASE_ANON_KEY; the project was
// provisioned with the newer publishable key. Accept either.
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = () => createBrowserClient(supabaseUrl!, supabaseKey!);
