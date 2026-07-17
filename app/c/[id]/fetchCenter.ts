import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Location, Refugio } from "@/components/helpmap/data";

// Reads a single center (a `locations` row) plus its optional `refugios` companion
// (recibe/necesita for shelters + acopios) by location_id. Both are public tables
// (anon-readable) — no sensitive patient fields involved, so no privacy filtering
// is needed here (unlike fetchPatient). See CLAUDE.md §13 (refugios) / db/refugios.sql.
export async function fetchCenter(
  id: string,
): Promise<{ loc: Location; ref: Refugio | null } | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: loc, error } = await supabase
      .from("locations")
      .select("*")
      .eq("location_id", id)
      .single();
    if (error || !loc) return null;

    // Companion needs row is optional (a hospital has none; a refugio/acopio may).
    const { data: ref } = await supabase
      .from("refugios")
      .select("*")
      .eq("location_id", id)
      .maybeSingle();

    return { loc: loc as Location, ref: (ref as Refugio | null) ?? null };
  } catch {
    return null;
  }
}
