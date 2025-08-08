// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";

export default async function DashboardIndex() {
  const supabase = createServerClient();

  // 1) Require auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login"); // or wherever your sign-in page lives
  }

  // 2) Check profile role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // 3) Send them to the right dashboard
  if (profile?.role === "tutor" || profile?.role === "admin") {
    redirect("/dashboard/tutor");
  }

  // default for students / unknown
  redirect("/dashboard/student");
}
