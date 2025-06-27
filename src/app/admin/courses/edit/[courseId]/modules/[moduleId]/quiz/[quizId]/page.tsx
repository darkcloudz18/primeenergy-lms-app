// src/app/admin/courses/edit/[courseId]/modules/[moduleId]/quiz/[quizId]/page.tsx
import React from "react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { QuizEntity } from "@/lib/types";

interface PageProps {
  params: {
    courseId: string;
    moduleId: string;
    quizId: string;
  };
}

export default async function EditQuizPage({ params }: PageProps) {
  const { quizId } = params;

  // fetch exactly the columns your QuizEntity interface needs
  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .select("id, course_id, module_id, title, description, passing_score")
    .eq("id", quizId)
    .single();

  if (error || !data) {
    return (
      <div className="p-6">
        <p className="text-red-600">
          Error loading quiz{error ? `: ${error.message}` : ""}
        </p>
      </div>
    );
  }

  // cast to your type
  const quiz = data as QuizEntity;

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-semibold mb-4">Edit Module Quiz</h1>
      <form action="/api/admin/update-quiz" method="post" className="space-y-4">
        {/* hidden IDs */}
        <input type="hidden" name="id" value={quiz.id} />
        <input type="hidden" name="course_id" value={quiz.course_id} />
        <input type="hidden" name="module_id" value={quiz.module_id} />

        {/* Title */}
        <div>
          <label className="block font-medium mb-1">Title</label>
          <input
            type="text"
            name="title"
            defaultValue={quiz.title}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block font-medium mb-1">Description</label>
          <textarea
            name="description"
            defaultValue={quiz.description || ""}
            rows={3}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Passing Score */}
        <div>
          <label className="block font-medium mb-1">Passing Score</label>
          <input
            type="number"
            name="passing_score"
            defaultValue={quiz.passing_score}
            required
            min={0}
            max={100}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Save Quiz
        </button>
      </form>
    </div>
  );
}
