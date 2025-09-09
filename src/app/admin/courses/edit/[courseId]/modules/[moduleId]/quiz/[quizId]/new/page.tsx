export const dynamic = "force-dynamic";

import QuizEditor, {
  EditorQuiz,
  EditorQuestion,
} from "@/components/QuizEditor";

export default function ModuleQuizNewPage({
  params,
}: {
  params: { courseId: string; moduleId: string };
}) {
  const { courseId, moduleId } = params;

  const initialQuiz: EditorQuiz = {
    course_id: courseId, // ✅ required
    module_id: moduleId, // ✅ required for module quiz
    title: "",
    passing_score: 0,
  };

  const initialQuestions: EditorQuestion[] = [];

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Add Module Quiz</h1>
      <QuizEditor
        initialQuiz={initialQuiz}
        initialQuestions={initialQuestions}
        courseId={courseId}
        moduleId={null}
        afterSaveBase="/admin"
      />
    </main>
  );
}
