import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Lesson, Module, ModuleWithLessons } from "@/lib/types";
import ClientCoursePage from "./components/ClientCoursePage";

interface PageProps {
  params: { courseId: string };
}

export default async function CoursePage({ params }: PageProps) {
  const { courseId } = params;

  // 1) course
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select(
      "id, title, description, image_url, category, level, tag, created_at"
    )
    .eq("id", courseId)
    .single();
  if (!course) throw new Error("Course not found");

  // 2) modules
  const { data: modulesRaw, error: modulesError } = await supabaseAdmin
    .from("modules")
    .select("id, course_id, title, ordering, created_at")
    .eq("course_id", courseId)
    .order("ordering", { ascending: true });
  if (modulesError) throw new Error(modulesError.message);
  const modules = (modulesRaw ?? []) as Module[];

  // 3) lessons
  const moduleIds = modules.map((m) => m.id);
  const lessonsByModule: Record<string, Lesson[]> = {};
  if (moduleIds.length > 0) {
    const { data: lessonsRaw, error: lessonsError } = await supabaseAdmin
      .from("lessons")
      .select(
        "id, module_id, title, content, type, ordering, image_url, created_at"
      )
      .in("module_id", moduleIds)
      .order("ordering", { ascending: true });
    if (lessonsError) throw new Error(lessonsError.message);

    for (const id of moduleIds) lessonsByModule[id] = [];
    (lessonsRaw ?? []).forEach((ls) => {
      lessonsByModule[ls.module_id].push(ls as Lesson);
    });
  }

  // 4) module-level quizzes → map module_id -> quiz_id
  let quizMap: Record<string, string> = {};
  if (moduleIds.length > 0) {
    const { data: quizzesRaw, error: quizzesError } = await supabaseAdmin
      .from("quizzes")
      .select("id, module_id")
      .in("module_id", moduleIds);
    if (quizzesError) throw new Error(quizzesError.message);
    quizMap = Object.fromEntries(
      (quizzesRaw ?? []).map((q) => [q.module_id as string, q.id as string])
    );
  }

  // 5) build modules+lessons+quiz_id
  const modulesWithLessons: ModuleWithLessons[] = modules.map((m) => ({
    id: m.id,
    title: m.title,
    ordering: m.ordering,
    quiz_id: quizMap[m.id] ?? undefined,
    lessons: lessonsByModule[m.id] || [],
  }));

  // 7) enrolled count
  const { count } = await supabaseAdmin
    .from("enrollments")
    .select("id", { head: true, count: "exact" })
    .eq("course_id", courseId);

  return (
    <ClientCoursePage
      courseId={course.id}
      title={course.title}
      description={course.description ?? undefined}
      imageUrl={course.image_url ?? undefined}
      category={course.category ?? undefined}
      level={course.level ?? undefined}
      tag={course.tag ?? undefined}
      enrolledCount={count ?? 0}
      modules={modulesWithLessons}
    />
  );
}
