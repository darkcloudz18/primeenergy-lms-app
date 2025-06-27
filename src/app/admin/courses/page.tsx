// src/app/admin/courses/page.tsx
import AdminCoursesClient from "./AdminCoursesClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Course } from "@/lib/types";

export default async function AdminCoursesPage() {
  // fetch ALL courses, bypassing RLS
  const { data: courses, error } = await supabaseAdmin.from<"courses", Course>(
    "courses"
  ).select(`
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
    `);

  if (error) throw new Error(error.message);

  // pass down an empty array instead of null
  return <AdminCoursesClient initialCourses={courses ?? []} />;
}
