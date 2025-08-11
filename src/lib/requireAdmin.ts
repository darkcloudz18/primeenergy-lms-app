import { createServerClient } from "@/lib/supabase-server";

export async function requireAdmin(): Promise<boolean> {
  const supabase = createServerClient();
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
