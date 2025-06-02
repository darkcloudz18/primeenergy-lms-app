// src/app/courses/[courseId]/modules/[moduleId]/quiz/page.tsx
import QuizPageClient from "./QuizPageClient";

interface PageProps {
  params: {
    courseId: string;
    moduleId: string;
    quizId: string;
  };
}

export default function Page({ params }: PageProps) {
  const { courseId, moduleId, quizId } = params;
  return (
    <QuizPageClient courseId={courseId} moduleId={moduleId} quizId={quizId} />
  );
}
