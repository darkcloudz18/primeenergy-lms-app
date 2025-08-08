// src/app/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/page.tsx
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import LessonPageClient from "./LessonPageClient";
import type { Module, Lesson, ModuleWithLessons } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { courseId: string; moduleId: string; lessonId: string };
}

export default async function LessonPage({ params }: PageProps) {
  const { courseId, moduleId, lessonId } = params;

  // 1) Auth
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/auth");

  // 2) Modules
  const { data: modulesRaw, error: modulesError } = await supabaseAdmin
    .from("modules")
    .select("id, title, ordering, course_id, created_at")
    .eq("course_id", courseId)
    .order("ordering", { ascending: true });
  if (modulesError || !modulesRaw) {
    throw new Error("Failed to load modules: " + modulesError.message);
  }
  const modules: Module[] = modulesRaw;

  // 3) Lessons
  const moduleIds = modules.map((m) => m.id);
  let lessonsByModule: Record<string, Lesson[]> = {};
  if (moduleIds.length) {
    const { data: lessonsRaw, error: lessonsError } = await supabaseAdmin
      .from("lessons")
      .select(
        "id, module_id, title, content, type, ordering, image_url, created_at"
      )
      .in("module_id", moduleIds)
      .order("ordering", { ascending: true });
    if (lessonsError || !lessonsRaw) {
      throw new Error("Failed to load lessons: " + lessonsError.message);
    }
    lessonsByModule = moduleIds.reduce((acc, id) => ({ ...acc, [id]: [] }), {});
    for (const l of lessonsRaw) {
      lessonsByModule[l.module_id].push(l);
    }
  }

  // 4) Build modulesWithLessons
  const modulesWithLessons: ModuleWithLessons[] = modules.map((m) => ({
    id: m.id,
    title: m.title,
    ordering: m.ordering,
    lessons: lessonsByModule[m.id] || [],
  }));

  // 5) Current lesson
  const { data: lessonRow, error: lessonError } = await supabaseAdmin
    .from("lessons")
    .select(
      "id, module_id, title, content, type, ordering, image_url, created_at"
    )
    .eq("id", lessonId)
    .single();
  if (lessonError || !lessonRow) {
    throw new Error("Lesson not found: " + lessonError.message);
  }
  const lesson: Lesson = lessonRow;

  // 6) Final quiz if any
  let finalQuizPath: string | undefined;
  const { data: fq, error: fqErr } = await supabaseAdmin
    .from("quizzes")
    .select("id")
    .eq("course_id", courseId)
    .is("module_id", null)
    .single();
  if (!fqErr && fq?.id) {
    const { data: q1 } = await supabaseAdmin
      .from("questions")
      .select("id")
      .eq("quiz_id", fq.id)
      .limit(1);
    if (q1 && q1.length) {
      finalQuizPath = `/courses/${courseId}/final-quiz`;
    }
  }

  // 7) User progress
  const { data: lcRows } = await supabase
    .from("lesson_completions")
    .select("lesson_id")
    .eq("user_id", user.id);
  const completedLessonIds = lcRows?.map((r) => r.lesson_id) || [];

  const { data: qaRows } = await supabase
    .from("quiz_attempts")
    .select("quiz_id")
    .eq("user_id", user.id)
    .eq("passed", true);
  const passedQuizIds = qaRows?.map((r) => r.quiz_id) || [];

  // 8) Render the client wrapper
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
