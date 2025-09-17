// src/app/courses/[courseId]/final-quiz/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Sidebar from "../modules/[moduleId]/lessons/[lessonId]/components/Sidebar";
import FinalQuizClient from "./FinalQuizClient";
import type { Module, Lesson, ModuleWithLessons } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FinalQuizPage({
  params,
}: {
  params: { courseId: string };
}) {
  const { courseId } = params;

  // RLS client for auth + user-specific queries
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // Course title (nice for the quiz & certificate)
  const { data: courseRow } = await supabase
    .from("courses")
    .select("title")
    .eq("id", courseId)
    .maybeSingle();
  const courseTitle = courseRow?.title ?? "Course";

  // Modules for this course
  const { data: modulesRaw, error: modulesErr } = await supabaseAdmin
    .from("modules")
    .select("id, title, ordering, course_id, created_at")
    .eq("course_id", courseId)
    .order("ordering", { ascending: true });

  if (modulesErr || !modulesRaw) {
    throw new Error("Failed to load modules: " + (modulesErr?.message ?? ""));
  }
  const modules: Module[] = modulesRaw;

  // Lessons for those modules
  const moduleIds = modules.map((m) => m.id);
  let lessonsByModule: Record<string, Lesson[]> = {};
  if (moduleIds.length) {
    const { data: lessonsRaw, error: lessonsErr } = await supabaseAdmin
      .from("lessons")
      .select(
        "id, module_id, title, content, type, ordering, image_url, created_at"
      )
      .in("module_id", moduleIds)
      .order("ordering", { ascending: true });

    if (lessonsErr) {
      throw new Error("Failed to load lessons: " + lessonsErr.message);
    }

    lessonsByModule = moduleIds.reduce((acc, id) => ({ ...acc, [id]: [] }), {});
    (lessonsRaw ?? []).forEach((l: any) => {
      lessonsByModule[l.module_id].push(l as Lesson);
    });
  }

  // Attach quiz_id per module (for sidebar badges etc.)
  let quizMap: Record<string, string> = {};
  if (moduleIds.length) {
    const { data: qzRaw, error: qzErr } = await supabaseAdmin
      .from("quizzes")
      .select("id, module_id")
      .in("module_id", moduleIds);
    if (qzErr) throw new Error("Failed to load module quizzes: " + qzErr.message);
    quizMap = Object.fromEntries((qzRaw ?? []).map((q) => [q.module_id, q.id]));
  }

  const modulesWithLessons: ModuleWithLessons[] = modules.map((m: Module) => ({
    id: m.id,
    title: m.title,
    ordering: m.ordering,
    quiz_id: quizMap[m.id],
    lessons: (lessonsByModule[m.id] || []) as Lesson[],
  }));

  // Final (course-level) quiz id
  const { data: fq } = await supabaseAdmin
    .from("quizzes")
    .select("id")
    .eq("course_id", courseId)
    .is("module_id", null)
    .maybeSingle();
  const finalQuizId = fq?.id ?? null;

  // User progress
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

  // Eligibility: all lessons completed
  const allLessonsCount = modulesWithLessons.reduce(
    (sum, m) => sum + m.lessons.length,
    0
  );
  const eligible = completedLessonIds.length >= allLessonsCount;

  // If final quiz already passed, show Congrats link in sidebar
  const finalQuizPassed = finalQuizId ? passedQuizIds.includes(finalQuizId) : false;
  const congratulationsPath = finalQuizPassed
    ? `/courses/${courseId}/congratulations`
    : undefined;

  return (
    <div className="flex h-screen">
      <Sidebar
        courseId={courseId}
        currentModuleId={modulesWithLessons[0]?.id ?? ""}
        currentLessonId={modulesWithLessons[0]?.lessons[0]?.id ?? ""}
        modules={modulesWithLessons}
        finalQuizPath={`/courses/${courseId}/final-quiz`}
        completedLessons={completedLessonIds}
        passedQuizzes={passedQuizIds}
        congratulationsPath={congratulationsPath}
      />

      <div className="flex-1 overflow-y-auto p-4">
        <FinalQuizClient
          courseId={courseId}
          courseTitle={courseTitle}
          eligible={eligible}
        />
      </div>
    </div>
  );
}