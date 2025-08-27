// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseRSC } from "@/lib/supabase-rsc";

export default async function DashboardRedirect() {
  const supabase = getSupabaseRSC();

  // who is logged in?
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) {
    redirect("/auth/login"); // not signed in
  }

  // get their role from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role?.toLowerCase();

  // send to the right dashboard
  if (role === "admin") {
    // change this to your preferred admin landing page
    redirect("/admin/dashboard");
  }
  if (role === "tutor") {
    redirect("/dashboard/tutor");
  }
  // default → student
  redirect("/dashboard/student");
}
