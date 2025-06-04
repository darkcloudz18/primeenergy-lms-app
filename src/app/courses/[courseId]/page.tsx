// src/app/courses/[courseId]/page.tsx
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Lesson, Module, ModuleWithLessons } from "@/lib/types";
import ClientCoursePage from "./components/ClientCoursePage";

interface PageProps {
  params: { courseId: string };
}

export default async function CoursePage({ params }: PageProps) {
  const { courseId } = params;

  // ── 1) Fetch course info (no generic on .from) ───────────────────────────
  const { data: course, error: courseError } = await supabaseAdmin
    .from("courses")
    .select("id, title, description, image_url, category, level, tag")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    throw new Error("Course not found");
  }

  // ── 2) Fetch all modules for this course (no generic on .from) ───────────
  const { data: modulesRaw, error: modulesError } = await supabaseAdmin
    .from("modules")
    .select("id, course_id, title, ordering, created_at")
    .eq("course_id", courseId)
    .order("ordering", { ascending: true });

  if (modulesError) {
    throw new Error(modulesError.message);
  }
  const modules = (modulesRaw ?? []) as Module[];

  // ── 3) Fetch all lessons for those module IDs ─────────────────────────────
  let lessonsByModule: Record<string, Lesson[]> = {};
  const moduleIds = modules.map((m) => m.id);

  if (moduleIds.length > 0) {
    const { data: lessonsRaw, error: lessonsError } = await supabaseAdmin
      .from("lessons")
      .select(
        "id, module_id, title, content, type, ordering, image_url, created_at"
      )
      .in("module_id", moduleIds)
      .order("ordering", { ascending: true });

    if (lessonsError) {
      throw new Error(lessonsError.message);
    }

    const lessons = lessonsRaw ?? [];
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

  // ── 4) Build ModuleWithLessons[] ────────────────────────────────────────
  const modulesWithLessons: ModuleWithLessons[] = modules.map((m) => ({
    id: m.id,
    title: m.title,
    ordering: m.ordering,
    quiz_id: m.quiz_id,
    lessons: lessonsByModule[m.id] || [],
  }));

  // ── 5) Fetch enrolled count ─────────────────────────────────────────────
  const { count: enrollCount } = await supabaseAdmin
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  // ── 6) Return ClientCoursePage ─────────────────────────────────────────
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
