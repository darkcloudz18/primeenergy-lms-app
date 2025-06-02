// src/app/courses/[courseId]/final-quiz/page.tsx
"use client";

import QuizPageClient from "./QuizPageClient";

interface FinalQuizPageProps {
  params: { courseId: string };
}

export default function FinalQuizPage({ params }: FinalQuizPageProps) {
  const { courseId } = params;
  // You might fetch a “final_quiz” entity keyed by courseId instead of moduleId
  return <QuizPageClient courseId={courseId} />;
}
