import { createServerClient } from "@/lib/supabase-server";

export type AppProfile = {
  id: string;
  role: "student" | "tutor" | "admin";
  first_name: string | null;
  last_name: string | null;
  status: string | null;
};

export async function getProfileServer(): Promise<AppProfile | null> {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name, status")
    .eq("id", user.id)
    .single();

  return (data as AppProfile) ?? null;
}
