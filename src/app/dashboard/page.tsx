// src/app/dashboard/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // 1) Grab cookies once
  const cookieStore = cookies();

  // 2) Create a Supabase client for Auth (reads cookies securely)
  const supabase = createServerComponentClient({
    cookies: () => cookieStore,
  });

  // 3) Get the logged-in user (verifies via Auth API)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    // not signed in
    redirect("/auth/login");
  }

  // 4) Fetch the canonical role from your profiles table using the SERVICE ROLE key
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    // something went wrong: no profile row
    redirect("/auth/login");
  }

  const { role } = profile;

  // 5) Now branch on the real role
  if (role === "admin") {
    redirect("/admin");
  }
  if (role === "tutor") {
    redirect("/dashboard/tutor");
  }

  // 6) Otherwise, render the student dashboard
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Student Dashboard</h1>
      {/* … your student‐only UI … */}
    </div>
  );
}
