// src/app/admin/my-courses/page.tsx
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import CourseCardGrid from "@/components/admin/CourseCardGrid";

export const dynamic = "force-dynamic";

export default async function MyCoursesPage() {
  const { data: courses, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">My Courses</h1>
      <CourseCardGrid courses={courses || []} />
    </div>
  );
}
