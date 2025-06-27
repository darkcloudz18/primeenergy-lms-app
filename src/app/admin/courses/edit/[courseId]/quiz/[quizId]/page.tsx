// src/app/admin/courses/edit/[courseId]/quiz/[quizId]/page.tsx
import React from "react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { QuizEntity } from "@/lib/types";


interface Props {
  params: { quizId: string };
}

export default async function EditFinalQuizPage({ params }: Props) {
  const { quizId } = params;

  // 🔥 no generics here
  const { data: raw, error } = await supabaseAdmin
    .from("quizzes")
    .select("id, course_id, module_id, title, description, passing_score")
    .eq("id", quizId)
    .single();

  if (error || !raw) {
    return (
      <p className="p-6 text-red-600">
        Error loading final quiz{error ? `: ${error.message}` : ""}
      </p>
    );
  }

  // now cast to your strong type
  const quiz = raw as QuizEntity;

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-semibold mb-4">Edit Final Quiz</h1>
      <form
        action="/api/admin/update-final-quiz"
        method="post"
        className="space-y-4"
      >
        <input type="hidden" name="id" value={quiz.id} />
        <input type="hidden" name="course_id" value={quiz.course_id} />
        {quiz.module_id && (
          <input type="hidden" name="module_id" value={quiz.module_id} />
        )}

        <label className="block">
          <span className="font-medium">Title</span>
          <input
            name="title"
            defaultValue={quiz.title}
            required
            className="w-full border rounded p-2"
          />
        </label>

        <label className="block">
          <span className="font-medium">Description</span>
          <textarea
            name="description"
            defaultValue={quiz.description || ""}
            className="w-full border rounded p-2"
          />
        </label>

        <label className="block">
          <span className="font-medium">Passing Score</span>
          <input
            type="number"
            name="passing_score"
            defaultValue={quiz.passing_score}
            required
            min={0}
            max={100}
            className="w-full border rounded p-2"
          />
        </label>

        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Save Final Quiz
        </button>
      </form>
    </div>
  );
}
