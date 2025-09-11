// src/lib/display-name.ts
import { getSupabaseRSC } from "@/lib/supabase-rsc";

export async function getDisplayName(userId: string): Promise<string> {
  const sb = getSupabaseRSC();

  // Try profiles table first
  const { data: prof } = await sb
    .from("profiles")
    .select("first_name, last_name, full_name")
    .eq("id", userId)
    .maybeSingle();

  const fromProfile =
    prof?.full_name ||
    [prof?.first_name, prof?.last_name].filter(Boolean).join(" ").trim();

  if (fromProfile) return fromProfile;

  // Fallback to auth user metadata
  const {
    data: { user },
  } = await sb.auth.getUser();

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  return (
    (meta.full_name as string) ||
    (meta.name as string) ||
    (user?.email as string) ||
    "Learner"
  );
}
