// src/app/admin/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import AdminDashboard from "@/components/AdminDashboard";
import type { Course, UserProfile } from "@/lib/types";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminPage() {
  // 1) Initialize Supabase server‐side client
  const supabase = createServerComponentClient({ cookies });

  // 2) Grab the session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 3) If not logged in, send to login
  if (!session) {
    redirect("/auth/login");
  }

  // 4) Lookup profile in your `profiles` table by email
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("email", session.user.email!)
    .single();

  // 5) If not admin, redirect home
  if (profile?.role !== "admin") {
    redirect("/");
  }

  // 6) Fetch your courses and users
  const { data: rawCourses } = await supabaseAdmin
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });
  const courses: Course[] = (rawCourses ?? []) as Course[];

  const { data: rawUsers } = await supabaseAdmin
    .from("profiles")
    .select("id, email, role, created_at")
    .order("created_at", { ascending: false });
  const users: UserProfile[] = (rawUsers ?? []) as UserProfile[];

  // 7) Render your client‐side AdminDashboard
  return <AdminDashboard initialCourses={courses} initialUsers={users} />;
}
