// src/app/courses/[courseId]/modules/[moduleId]/quiz/[quizId]/page.tsx

import QuizPageClient from "./QuizPageClient";

interface PageProps {
  params: {
    courseId: string;
    moduleId: string; // (we still accept moduleId in the URL, but we won't forward it)
    quizId: string;
  };
}

export default function QuizPage({ params }: PageProps) {
  const { courseId, quizId } = params;

  return (
    <div className="max-w-3xl mx-auto my-8">
      <h1 className="text-2xl font-semibold mb-4">Quiz</h1>
      {/* Only pass courseId and quizId */}
      <QuizPageClient courseId={courseId} quizId={quizId} />
    </div>
  );
}
