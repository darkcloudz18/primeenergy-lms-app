import QuizEditor, {
  type EditorQuiz,
  type EditorQuestion,
} from "../../quiz/[quizId]/QuizEditor";

type PageProps = {
  params: { courseId: string };
};

export default async function NewFinalQuizPage({ params }: PageProps) {
  const { courseId } = params;

  const initialQuiz: EditorQuiz = {
    course_id: courseId,
    module_id: null, // final quiz
    title: "",
    passing_score: 0,
  };

  const initialQuestions: EditorQuestion[] = [];

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">New Final Quiz</h1>
      <QuizEditor
        initialQuiz={initialQuiz}
        initialQuestions={initialQuestions}
      />
    </main>
  );
}
