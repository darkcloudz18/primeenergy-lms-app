// src/app/admin/courses/page.tsx
import AdminCoursesClient from "./AdminCoursesClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Course } from "@/lib/types";

export const dynamic = "force-dynamic"; // always fetch fresh
export const revalidate = 0;

export default async function AdminCoursesPage() {
  const { data, error } = await supabaseAdmin
    .from<"courses", Course>("courses")
    .select(
      `
      id,
      title,
      description,
      image_url,
      category,
      level,
      tag,
      archived,
      instructor_id,
      created_at
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <p className="text-red-600">Error loading courses: {error.message}</p>
      </main>
    );
  }

  return <AdminCoursesClient initialCourses={data ?? []} />;
}
