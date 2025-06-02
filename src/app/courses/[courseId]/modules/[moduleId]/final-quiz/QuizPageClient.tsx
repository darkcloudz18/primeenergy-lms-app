// src/app/courses/[courseId]/modules/[moduleId]/final-quiz/QuizPageClient.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Question, Option } from "@/lib/types";

interface QuizPageClientProps {
  courseId: string;
}

export default function QuizPageClient({ courseId }: QuizPageClientProps) {
  const [questions, setQuestions] = useState<
    (Question & { options: Option[] })[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFinalQuiz() {
      // 1️⃣ Find the “final‐quiz” for this course (module_id = null).
      const { data: quizRow, error: quizErr } = await supabase
        .from("quizzes")
        .select("id")
        .eq("course_id", courseId)
        .is("module_id", null)
        .single();

      if (quizErr || !quizRow) {
        console.error("No final quiz found or error:", quizErr);
        setLoading(false);
        return;
      }
      const finalQuizId = quizRow.id;

      // 2️⃣ Fetch all questions (including created_at) for that quiz
      const { data: qData, error: qErr } = await supabase
        .from("quiz_questions")
        .select("id, quiz_id, prompt_html, question_type, ordering, created_at")
        .eq("quiz_id", finalQuizId)
        .order("ordering", { ascending: true });

      if (qErr || !qData) {
        console.error("Error loading questions:", qErr);
        setLoading(false);
        return;
      }

      // 3️⃣ For each question, fetch its options (including created_at)
      const questionsWithOptions: (Question & { options: Option[] })[] =
        await Promise.all(
          qData.map(async (qRow) => {
            // Build a Question object that includes its created_at
            const question: Question = {
              id: qRow.id,
              quiz_id: qRow.quiz_id,
              prompt_html: qRow.prompt_html,
              question_type: qRow.question_type,
              ordering: qRow.ordering,
              created_at: qRow.created_at,
            };

            let opts: Option[] = [];
            if (
              qRow.question_type === "multiple_choice" ||
              qRow.question_type === "true_false"
            ) {
              // fetch options (with created_at)
              const { data: optData, error: optErr } = await supabase
                .from("quiz_options")
                .select(
                  "id, question_id, text, is_correct, ordering, created_at"
                )
                .eq("question_id", qRow.id)
                .order("ordering", { ascending: true });

              if (optErr || !optData) {
                console.error("Error loading options:", optErr);
                opts = [];
              } else {
                // cast each row to Option
                opts = optData.map((row) => ({
                  id: row.id,
                  question_id: row.question_id,
                  text: row.text,
                  is_correct: row.is_correct,
                  ordering: row.ordering,
                  created_at: row.created_at,
                }));
              }
            }

            return {
              ...question,
              options: opts,
            };
          })
        );

      setQuestions(questionsWithOptions);
      setLoading(false);
    }

    loadFinalQuiz();
  }, [courseId]);

  if (loading) return <p>Loading final quiz…</p>;
  if (questions.length === 0) return <p>No final quiz available.</p>;

  return (
    <div className="space-y-6">
      {questions.map((q, idx) => (
        <div key={q.id} className="p-4 border rounded-lg">
          <p className="font-medium">
            {idx + 1}.{" "}
            <span dangerouslySetInnerHTML={{ __html: q.prompt_html }} />
          </p>

          {/* If multiple choice or true/false, render radio buttons */}
          {(q.question_type === "multiple_choice" ||
            q.question_type === "true_false") && (
            <ul className="mt-2 space-y-2">
              {q.options.map((opt) => (
                <li key={opt.id} className="flex items-center">
                  <input
                    type="radio"
                    name={`question-${q.id}`}
                    value={opt.id}
                    className="mr-2"
                  />
                  <label>{opt.text}</label>
                </li>
              ))}
            </ul>
          )}

          {/* If short answer, render a textarea */}
          {q.question_type === "short_answer" && (
            <textarea
              name={`question-${q.id}`}
              rows={2}
              className="mt-2 w-full border-gray-300 rounded px-2 py-1"
              placeholder="Your answer…"
            />
          )}
        </div>
      ))}

      <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
        Submit Final Quiz
      </button>
    </div>
  );
}
