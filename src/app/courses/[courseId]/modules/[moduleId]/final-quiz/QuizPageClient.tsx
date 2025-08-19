// src/app/courses/[courseId]/modules/[moduleId]/final-quiz/QuizPageClient.tsx
// src/app/courses/[courseId]/final-quiz/QuizPageClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type QuestionType = "multiple_choice" | "true_false" | "short_answer";

type Option = {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  ordering: number | null;
  created_at?: string | null;
};

type Question = {
  id: string;
  quiz_id: string;
  prompt_html: string;
  question_type: QuestionType;
  ordering: number | null;
  created_at?: string | null;
};

interface QuizPageClientProps {
  courseId: string;
}

export default function QuizPageClient({ courseId }: QuizPageClientProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState<
    (Question & { options: Option[] })[]
  >([]);

  // radios/checkbox/inputs captured here:
  // For MC/TF: answers[questionId] = optionId
  // For short answer: shortAnswers[questionId] = string
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadFinalQuiz() {
      setLoading(true);
      try {
        // 1) Find final-quiz for this course (module_id is null)
        const { data: quizRow, error: quizErr } = await supabase
          .from("quizzes")
          .select("id")
          .eq("course_id", courseId)
          .is("module_id", null)
          .maybeSingle();

        if (quizErr || !quizRow) {
          console.error("No final quiz found or error:", quizErr);
          setQuestions([]);
          return;
        }

        // 2) Fetch questions
        const { data: qData, error: qErr } = await supabase
          .from("quiz_questions")
          .select("id, quiz_id, prompt_html, type, ordering, created_at")
          .eq("quiz_id", quizRow.id)
          .order("ordering", { ascending: true });

        if (qErr || !qData?.length) {
          setQuestions([]);
          return;
        }

        // 3) Fetch options per question when needed
        const full = await Promise.all(
          qData.map(async (q) => {
            const question: Question = {
              id: q.id,
              quiz_id: q.quiz_id,
              prompt_html: q.prompt_html,
              question_type: q.type as QuestionType,
              ordering: q.ordering,
              created_at: q.created_at,
            };

            if (question.question_type === "short_answer") {
              return { ...question, options: [] as Option[] };
            }

            const { data: optData, error: optErr } = await supabase
              .from("quiz_options")
              .select("id, question_id, text, is_correct, ordering, created_at")
              .eq("question_id", q.id)
              .order("ordering", { ascending: true });

            if (optErr || !optData) {
              return { ...question, options: [] as Option[] };
            }

            const options: Option[] = optData.map((r) => ({
              id: r.id,
              question_id: r.question_id,
              text: r.text,
              is_correct: r.is_correct,
              ordering: r.ordering,
              created_at: r.created_at,
            }));

            return { ...question, options };
          })
        );

        setQuestions(full);
      } finally {
        setLoading(false);
      }
    }

    loadFinalQuiz();
  }, [courseId]);

  const canSubmit = useMemo(() => {
    // All MC/TF must have a selected option; short answers can be empty or required (your call).
    for (const q of questions) {
      if (q.question_type === "short_answer") continue; // allow empty or enforce if you want
      if (!answers[q.id]) return false;
    }
    return questions.length > 0;
  }, [questions, answers]);

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      // Build answer payload
      // MC/TF -> { question_id, option_id }
      // Short -> { question_id, text }
      const payloadAnswers = questions.map((q) => {
        if (q.question_type === "short_answer") {
          return {
            question_id: q.id,
            text: shortAnswers[q.id] ?? "",
          };
        }
        return {
          question_id: q.id,
          option_id: answers[q.id] ?? null,
        };
      });

      // 1) Submit to evaluation API
      const res = await fetch("/api/quizzes/submit-final", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ courseId, answers: payloadAnswers }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Quiz submit failed");

      if (json.passed === true) {
        // 2) Issue certificate
        await fetch("/api/certificates/issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ courseId }),
        });

        // 3) Redirect to congrats
        router.replace(`/courses/${courseId}/congrats`);
      } else {
        const msg = `Score: ${json.score ?? "—"} / Passing: ${
          json.passing_score ?? "—"
        }. Try again!`;
        alert(msg);
      }
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

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

          {(q.question_type === "multiple_choice" ||
            q.question_type === "true_false") && (
            <ul className="mt-2 space-y-2">
              {q.options.map((opt) => (
                <li key={opt.id} className="flex items-center">
                  <input
                    type="radio"
                    name={`question-${q.id}`}
                    value={opt.id}
                    checked={answers[q.id] === opt.id}
                    onChange={(e) =>
                      setAnswers((s) => ({ ...s, [q.id]: e.target.value }))
                    }
                    className="mr-2"
                  />
                  <label>{opt.text}</label>
                </li>
              ))}
            </ul>
          )}

          {q.question_type === "short_answer" && (
            <textarea
              name={`question-${q.id}`}
              rows={2}
              className="mt-2 w-full border-gray-300 rounded px-2 py-1"
              placeholder="Your answer…"
              value={shortAnswers[q.id] ?? ""}
              onChange={(e) =>
                setShortAnswers((s) => ({ ...s, [q.id]: e.target.value }))
              }
            />
          )}
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit Final Quiz"}
      </button>
    </div>
  );
}
