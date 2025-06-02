// src/app/courses/[courseId]/page.tsx
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Module, Lesson, ModuleWithLessons } from "@/lib/types";
import ClientCoursePage from "./components/ClientCoursePage";

interface PageProps {
  params: { courseId: string };
}

export default async function CoursePage({ params }: PageProps) {
  const { courseId } = params;

  // ─── 1️⃣ Fetch course info (including category/level/tag) ───────────────────────────
  const { data: course, error: courseError } = await supabaseAdmin
    .from("courses")
    .select(
      "id, title, description, image_url, category, level, tag, created_at"
    )
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    throw new Error("Course not found");
  }

  // ─── 2️⃣ Fetch all modules for this course ───────────────────────────────────────────
  const { data: modulesRaw } = await supabaseAdmin
    .from("modules")
    .select("id, course_id, title, ordering")
    .eq("course_id", courseId)
    .order("ordering", { ascending: true });

  const modules = (modulesRaw as Module[]) || [];
  const moduleIds = modules.map((m) => m.id);

  // ─── 3️⃣ Fetch all lessons for those modules in one go ───────────────────────────────
  let lessonsByModule: Record<string, Lesson[]> = {};
  if (moduleIds.length > 0) {
    const { data: lessonsRaw } = await supabaseAdmin
      .from("lessons")
      .select(
        "id, module_id, title, content, type, ordering, image_url, created_at"
      )
      .in("module_id", moduleIds)
      .order("ordering", { ascending: true });

    const lessons = (lessonsRaw as Lesson[]) || [];
    lessonsByModule = moduleIds.reduce((acc, id) => {
      acc[id] = [];
      return acc;
    }, {} as Record<string, Lesson[]>);

    lessons.forEach((lesson) => {
      if (lessonsByModule[lesson.module_id]) {
        lessonsByModule[lesson.module_id].push(lesson);
      }
    });
  }

  // ─── 4️⃣ Build modulesWithLessons[] ────────────────────────────────────────────────
  const modulesWithLessons: ModuleWithLessons[] = modules.map((m) => ({
    id: m.id,
    title: m.title,
    ordering: m.ordering,
    lessons: lessonsByModule[m.id] || [],
  }));

  // ─── 5️⃣ Fetch enrolledCount separately ────────────────────────────────────────────
  const { count: enrollCount } = await supabaseAdmin
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  // ─── 6️⃣ Render ClientCoursePage ──────────────────────────────────────────────────
  return (
    <ClientCoursePage
      courseId={course.id}
      title={course.title}
      description={course.description ?? undefined}
      imageUrl={course.image_url ?? undefined}
      category={course.category ?? undefined}
      level={course.level ?? undefined}
      tag={course.tag ?? undefined}
      enrolledCount={enrollCount ?? 0}
      modules={modulesWithLessons}
    />
  );
}
