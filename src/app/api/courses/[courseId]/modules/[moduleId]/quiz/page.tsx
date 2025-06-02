// src/app/api/courses/[courseId]/modules/[moduleId]/quiz/QuizPageClient.tsx
"use client";

import React from "react";

export interface QuizPageClientProps {
  courseId: string;
  moduleId: string;
  quizId: string;
}

export default function QuizPageClient({
  courseId,
  moduleId,
  quizId,
}: QuizPageClientProps) {
  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg space-y-4">
      <h2 className="text-xl font-semibold">
        Quiz &quot;{quizId}&quot; (Course: {courseId} / Module: {moduleId})
      </h2>
      <p className="text-sm text-gray-600">
        This is where you would fetch and render all questions for{" "}
        <code>{quizId}</code>.
      </p>
    </div>
  );
}
