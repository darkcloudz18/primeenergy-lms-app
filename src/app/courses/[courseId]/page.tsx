// src/app/courses/[courseId]/page.tsx
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Lesson, Module, ModuleWithLessons } from "@/lib/types";
import ClientCoursePage from "./components/ClientCoursePage";

interface PageProps {
  params: { courseId: string };
}

export default async function CoursePage({ params }: PageProps) {
  const { courseId } = params;

  // 1) fetch course
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select(
      "id, title, description, image_url, category, level, tag, created_at"
    )
    .eq("id", courseId)
    .single();
  if (!course) throw new Error("Course not found");

  // 2) fetch modules (no quiz_id here)
  const { data: modulesRaw, error: modulesError } = await supabaseAdmin
    .from("modules")
    .select("id, course_id, title, ordering, created_at")
    .eq("course_id", courseId)
    .order("ordering", { ascending: true });
  if (modulesError) throw new Error(modulesError.message);
  const modules = (modulesRaw ?? []) as Module[];

  // 3) fetch lessons
  const moduleIds = modules.map((m) => m.id);
  const lessonsByModule: Record<string, Lesson[]> = {};
  if (moduleIds.length) {
    const { data: lessonsRaw, error: lessonsError } = await supabaseAdmin
      .from("lessons")
      .select(
        "id, module_id, title, content, type, ordering, image_url, created_at"
      )
      .in("module_id", moduleIds)
      .order("ordering", { ascending: true });
    if (lessonsError) throw new Error(lessonsError.message);
    // init buckets
    for (const id of moduleIds) lessonsByModule[id] = [];
    (lessonsRaw ?? []).forEach((ls) => {
      lessonsByModule[ls.module_id].push(ls as Lesson);
    });
  }

  // 4) fetch quizzes so we can attach quiz_id by module
  const { data: quizzesRaw, error: quizzesError } = await supabaseAdmin
    .from("quizzes")
    .select("id, module_id")
    .in("module_id", moduleIds);
  if (quizzesError) throw new Error(quizzesError.message);
  const quizMap = Object.fromEntries(
    (quizzesRaw ?? []).map((q) => [q.module_id, q.id])
  );

  // 5) build ModuleWithLessons[]
  const modulesWithLessons: ModuleWithLessons[] = modules.map((m) => ({
    id: m.id,
    title: m.title,
    ordering: m.ordering,
    quiz_id: quizMap[m.id] ?? undefined,
    lessons: lessonsByModule[m.id] || [],
  }));

  // 6) fetch enrolled count
  const { count } = await supabaseAdmin
    .from("enrollments")
    .select("id", { head: true, count: "exact" })
    .eq("course_id", courseId);

  const enrolledCount = count ?? 0;

  return (
    <ClientCoursePage
      courseId={course.id}
      title={course.title}
      description={course.description ?? undefined}
      imageUrl={course.image_url ?? undefined}
      category={course.category ?? undefined}
      level={course.level ?? undefined}
      tag={course.tag ?? undefined}
      enrolledCount={enrolledCount}
      modules={modulesWithLessons}
    />
  );
}
