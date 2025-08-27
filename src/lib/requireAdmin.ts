import { getSupabaseRSC } from "@/lib/supabase-rsc";

export async function requireAdmin(): Promise<boolean> {
  const supabase = getSupabaseRSC();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return false;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (data?.role ?? "").toLowerCase();
  return role === "admin" || role === "super admin";
}
