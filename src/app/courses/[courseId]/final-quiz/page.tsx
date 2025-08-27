// src/app/courses/[courseId]/final-quiz/page.tsx
import { getSupabaseRSC } from "@/lib/supabase-rsc";
import LearningShell from "../modules/[moduleId]/lessons/[lessonId]/components/LearningShell";
import { UIModule } from "../modules/[moduleId]/lessons/[lessonId]/components/Sidebar";
import FinalQuizClient from "./FinalQuizClient";

type PageProps = { params: { courseId: string } };

type LessonRow = { id: string; title: string; ordering: number };
type QuizRel = { id: string; module_id: string };
type ModuleRow = {
  id: string;
  title: string;
  ordering: number;
  lessons: LessonRow[] | null;
  quizzes: QuizRel[] | null;
};

export default async function FinalQuizPage({ params }: PageProps) {
  const courseId = params.courseId;
  const supabase = getSupabaseRSC();

  // user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // course title
  const { data: courseRow } = await supabase
    .from("courses")
    .select("title")
    .eq("id", courseId)
    .maybeSingle();

  // modules + minimal lessons + optional module quiz id
  const { data: modulesRaw } = await supabase
    .from("modules")
    .select(
      "id, title, ordering, lessons(id,title,ordering), quizzes!left(id,module_id)"
    )
    .eq("course_id", courseId)
    .order("ordering", { ascending: true });

  const modules: UIModule[] =
    (modulesRaw as ModuleRow[] | null)?.map((m) => ({
      id: m.id,
      title: m.title,
      ordering: m.ordering,
      lessons: (m.lessons ?? []).map((l) => ({
        id: l.id,
        title: l.title,
        ordering: l.ordering,
      })),
      quiz_id: m.quizzes?.[0]?.id,
    })) ?? [];

  // completion for sidebar
  const completedLessons =
    (
      await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("user_id", user?.id ?? "")
    ).data?.map((r) => r.lesson_id) ?? [];

  const passedQuizzes =
    (
      await supabase
        .from("quiz_attempts")
        .select("quiz_id")
        .eq("user_id", user?.id ?? "")
        .eq("passed", true)
    ).data?.map((r) => r.quiz_id) ?? [];

  // final quiz id
  const { data: finalQuiz } = await supabase
    .from("quizzes")
    .select("id")
    .eq("course_id", courseId)
    .is("module_id", null)
    .maybeSingle();

  // latest attempt for the “Last attempt” line
  let finalAttempt:
    | { score: number; passed: boolean; finishedAt?: string }
    | undefined;

  if (user && finalQuiz?.id) {
    const { data: latest } = await supabase
      .from("quiz_attempts")
      .select("score, passed, finished_at, created_at")
      .eq("user_id", user.id)
      .eq("quiz_id", finalQuiz.id)
      .order("finished_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest) {
      finalAttempt = {
        score: latest.score ?? 0,
        passed: !!latest.passed,
        finishedAt: latest.finished_at ?? undefined,
      };
    }
  }

  // eligibility
  const allModulesComplete = modules.every((m) =>
    m.quiz_id
      ? passedQuizzes.includes(m.quiz_id)
      : m.lessons.every((l) => completedLessons.includes(l.id))
  );

  return (
    <LearningShell
      courseId={courseId}
      currentModuleId=""
      currentLessonId=""
      modules={modules}
      finalQuizPath={`/courses/${courseId}/final-quiz`}
      completedLessons={completedLessons}
      passedQuizzes={passedQuizzes}
      courseTitle={courseRow?.title ?? "Course"}
      finalAttempt={finalAttempt}
    >
      <div className="p-6">
        <FinalQuizClient
          courseId={courseId}
          courseTitle={courseRow?.title ?? "Course"}
          eligible={allModulesComplete}
        />
      </div>
    </LearningShell>
  );
}
