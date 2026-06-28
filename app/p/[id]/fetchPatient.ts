import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { PatientPublic } from "@/components/helpmap/data";

// Reads a single record from the privacy-filtered `patients_public` view by id.
// Never touches the base `patients` table (CLAUDE.md §2).
export async function fetchPatient(id: string): Promise<PatientPublic | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase
      .from("patients_public")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as PatientPublic;
  } catch {
    return null;
  }
}
