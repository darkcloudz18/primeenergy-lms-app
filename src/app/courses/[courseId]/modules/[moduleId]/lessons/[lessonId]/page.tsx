// src/app/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/page.tsx
import { redirect, notFound } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import LessonPageClient from "./LessonPageClient";
import type { Module, Lesson, ModuleWithLessons } from "@/lib/types";

export const dynamic = "force-dynamic"; // disable caching for this page

interface PageProps {
  params: { courseId: string; moduleId: string; lessonId: string };
}

export default async function LessonPage({ params }: PageProps) {
  const { courseId, moduleId, lessonId } = params;

  // 1) Auth via RLS client
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // 2) Fetch modules, current lesson, and course-level final quiz in parallel
  const [
    { data: modulesRaw, error: modulesError },
    { data: lessonRow, error: lessonError },
    { data: finalQuizRow, error: finalQuizErr },
  ] = await Promise.all([
    supabaseAdmin
      .from("modules")
      .select("id, title, ordering, course_id, created_at")
      .eq("course_id", courseId)
      .order("ordering", { ascending: true }),
    supabaseAdmin
      .from("lessons")
      .select(
        "id, module_id, title, content, type, ordering, image_url, created_at"
      )
      .eq("id", lessonId)
      .single(),
    supabaseAdmin
      .from("quizzes")
      .select("id")
      .eq("course_id", courseId)
      .is("module_id", null)
      .maybeSingle(),
  ]);

  if (modulesError) throw new Error(`Failed to load modules: ${modulesError.message}`);
  if (lessonError || !lessonRow) notFound();

  const modules: Module[] = (modulesRaw ?? []) as Module[];

  // 3) Guard: the lesson must belong to this course
  const moduleIds = modules.map((m) => m.id);
  if (!moduleIds.includes(lessonRow.module_id)) notFound();

  const lesson: Lesson = lessonRow as unknown as Lesson;

  // 4) Fetch all lessons per module and module-level quizzes in parallel
// lessons + module-level quizzes
const [
  { data: lessonsRaw, error: lessonsError },
  { data: qzRaw, error: qzErr },
] = await Promise.all([
  moduleIds.length
    ? supabaseAdmin
        .from("lessons")
        .select("id, module_id, title, content, type, ordering, image_url, created_at")
        .in("module_id", moduleIds)
        .order("ordering", { ascending: true })
        .returns<Lesson[]>()                                  // 👈 typed
    : Promise.resolve({ data: [] as Lesson[], error: null }),

  moduleIds.length
    ? supabaseAdmin
        .from("quizzes")
        .select("id, module_id")
        .in("module_id", moduleIds)
        .returns<Array<{ id: string; module_id: string }>>()  // 👈 typed
    : Promise.resolve({ data: [] as Array<{ id: string; module_id: string }>, error: null }),
]);

  if (lessonsError) throw new Error(`Failed to load lessons: ${lessonsError.message}`);
  if (qzErr) throw new Error(`Failed to load module quizzes: ${qzErr.message}`);

  // 5) Shape data for the client
  const lessonsByModule: Record<string, Lesson[]> = Object.fromEntries(
    moduleIds.map((id) => [id, [] as Lesson[]])
  );
  (lessonsRaw ?? []).forEach((l) => {
    const arr = lessonsByModule[l.module_id] ?? (lessonsByModule[l.module_id] = []);
    arr.push(l as unknown as Lesson);
  });

  const quizMap: Record<string, string | undefined> = {};
  (qzRaw ?? []).forEach((q) => {
    quizMap[q.module_id] = q.id;
  });

  const modulesWithLessons: ModuleWithLessons[] = modules.map((m) => ({
    id: m.id,
    title: m.title,
    ordering: m.ordering,
    quiz_id: quizMap[m.id],
    lessons: lessonsByModule[m.id] || [],
  }));

  // 6) Compute final quiz path only if it has ≥ 1 question
  let finalQuizPath: string | undefined;
  if (finalQuizRow?.id) {
    const { count, error: countErr } = await supabaseAdmin
      .from("quiz_questions")
      .select("id", { head: true, count: "exact" })
      .eq("quiz_id", finalQuizRow.id);
    if (countErr)
      throw new Error(`Failed to load final quiz questions: ${countErr.message}`);
    if ((count ?? 0) > 0) {
      finalQuizPath = `/courses/${courseId}/final-quiz`;
    }
  }

  // 7) User progress via RLS client
  const [{ data: lcRows }, { data: qaRows }] = await Promise.all([
    supabase.from("lesson_completions").select("lesson_id").eq("user_id", user.id),
    supabase
      .from("quiz_attempts")
      .select("quiz_id")
      .eq("user_id", user.id)
      .eq("passed", true),
  ]);

  const completedLessonIds = (lcRows ?? []).map((r) => r.lesson_id);
  const passedQuizIds = (qaRows ?? []).map((r) => r.quiz_id);

  // 8) Render
  return (
    <LessonPageClient
      courseId={courseId}
      moduleId={moduleId}
      lessonId={lessonId}
      lessonTitle={lesson.title}
      lessonContent={lesson.content}
      modules={modulesWithLessons}
      finalQuizPath={finalQuizPath}
      initialCompleted={completedLessonIds}
      initialPassed={passedQuizIds}
    />
  );
}