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
  //
  // ─── Later you can use `useEffect` + `useState` + `supabase` to load questions/options
  // For now, we’ll just render a placeholder.
  //
  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg space-y-4">
      <h2 className="text-xl font-semibold">
        Quiz &quot;{quizId}&quot; (Course: {courseId} / Module: {moduleId})
      </h2>
      <p className="text-sm text-gray-600">
        This is where you would fetch and render all questions for{" "}
        <code>quizId</code>.
      </p>
      {/* 
        Example (to wire up later):
        
        import { useEffect, useState } from "react";
        import { supabase } from "@/lib/supabaseClient";
        import type { Question, Option } from "@/lib/types";

        const [questions, setQuestions] = useState<(Question & { options: Option[] })[]>([]);

        useEffect(() => {
          supabase
            .from("quiz_questions")
            .select(`
              id,
              prompt_html,
              question_type,
              ordering,
              options:quiz_options (
                id,
                question_id,
                text,
                is_correct,
                ordering,
                created_at
              )
            `)
            .eq("quiz_id", quizId)
            .then(({ data }) => {
              if (data) setQuestions(data as (Question & { options: Option[] })[]);
            });
        }, [quizId]);

        Then map over `questions` below.
      */}
    </div>
  );
}
