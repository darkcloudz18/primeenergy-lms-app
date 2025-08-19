// src/app/courses/[courseId]/modules/[moduleId]/final-quiz/page.tsx
"use client";

import QuizPageClient from "./QuizPageClient";

interface FinalQuizPageProps {
  params: { courseId: string };
}

export default function FinalQuizPage({ params }: FinalQuizPageProps) {
  const { courseId } = params;
  return <QuizPageClient courseId={courseId} />;
}
