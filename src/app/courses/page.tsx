// src/app/courses/page.tsx
import { supabase } from "@/lib/supabaseClient";
import CoursesPageClient, { Course } from "@/components/CoursesPageClient";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  // 1) Fetch all courses (no generic on .from)
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, description, image_url, category, level");

  if (error) {
    return (
      <div className="p-6 text-red-600">
        <strong>Supabase error:</strong> {error.message}
      </div>
    );
  }

  // 2) Cast to your Course interface
  const courses = (data as Course[]) ?? [];

  // 3) Build unique category & level lists
  const categories = Array.from(
    new Set(
      courses.map((c) => c.category).filter((c): c is string => Boolean(c))
    )
  );
  const levels = Array.from(
    new Set(courses.map((c) => c.level).filter((l): l is string => Boolean(l)))
  );

  // 4) Render your client‐side component
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* white background, rounded, shadow */}
      <div className="bg-white rounded-lg shadow p-8">
        <CoursesPageClient
          initialCourses={courses}
          categories={categories}
          levels={levels}
        />
      </div>
    </div>
  );
}
