// src/app/admin/courses/edit/[courseId]/modules/[moduleId]/quiz/new/page.tsx
export const dynamic = "force-dynamic";

import QuizEditor, {
  type EditorQuiz,
  type EditorQuestion,
} from "@/components/QuizEditor";

export default function AdminModuleQuizNewPage({
  params,
}: {
  params: { courseId: string; moduleId: string };
}) {
  const { courseId, moduleId } = params;

  const initialQuiz: EditorQuiz = {
    course_id: courseId,
    module_id: moduleId,
    title: "",
    passing_score: 0,
  };

  const initialQuestions: EditorQuestion[] = [];

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">New Module Quiz</h1>
      <QuizEditor
        initialQuiz={initialQuiz}
        initialQuestions={initialQuestions}
        courseId={courseId}
        moduleId={moduleId} // <-- IMPORTANT
        afterSaveBase="/admin"
      />
    </main>
  );
}
