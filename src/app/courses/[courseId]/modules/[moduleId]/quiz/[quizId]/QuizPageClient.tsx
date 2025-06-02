// src/app/courses/[courseId]/modules/[moduleId]/quiz/[quizId]/QuizPageClient.tsx
"use client";

import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Question, Option } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";

/**
 * Each Question row (from "quiz_questions" table) is combined with its array of Option rows:
 */
type QuestionWithOptions = Question & {
  options: Option[];
};

/**
 * Raw shape as returned by supabase.from("quiz_questions").select(...)
 *   (your DB column is named `type`, not `question_type`)
 */
interface RawQuestionRow {
  id: string;
  quiz_id: string;
  prompt_html: string;
  type: string; // the actual column name
  ordering: number;
  created_at: string;
}

/**
 * Represents a student’s answer. We distinguish between:
 *  - short_answer: answerText
 *  - multiple_choice / true_false: selectedOptionIds[]
 */
type StudentAnswer =
  | { questionId: string; answerText: string }
  | { questionId: string; selectedOptionIds: string[] };

interface QuizPageClientProps {
  courseId: string;
  quizId: string;
}

export default function QuizPageClient({
  courseId,
  quizId,
}: QuizPageClientProps) {
  const router = useRouter();

  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // ─── Load all questions (including their options) ───────────────────────────────────
  useEffect(() => {
    async function loadQuiz() {
      setLoading(true);
      setErrorMsg(null);

      // 1) Fetch question rows from "quiz_questions" table (no generics)
      const { data: rawQuestions, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("id, quiz_id, prompt_html, type, ordering, created_at")
        .eq("quiz_id", quizId)
        .order("ordering", { ascending: true });

      if (questionsError || !rawQuestions) {
        console.error("Error loading questions:", questionsError);
        setErrorMsg("Failed to load quiz questions.");
        setLoading(false);
        return;
      }

      // 2) Cast to RawQuestionRow[] and map into our Question[]
      const typedQuestions: Question[] = (rawQuestions as RawQuestionRow[]).map(
        (raw) => ({
          id: raw.id,
          quiz_id: raw.quiz_id,
          prompt_html: raw.prompt_html,
          question_type: raw.type as
            | "multiple_choice"
            | "true_false"
            | "short_answer",
          ordering: raw.ordering,
          created_at: raw.created_at,
        })
      );

      // 3) Fetch all Option rows for those questions (no generics)
      const questionIds = typedQuestions.map((q) => q.id);
      const { data: rawOptions, error: optionsError } = await supabase
        .from("quiz_options")
        .select("id, question_id, text, is_correct, ordering, created_at")
        .in("question_id", questionIds)
        .order("ordering", { ascending: true });

      if (optionsError || !rawOptions) {
        console.error("Error loading options:", optionsError);
        setErrorMsg("Failed to load quiz options.");
        setLoading(false);
        return;
      }

      // 4) Cast to Option[] and group by question_id
      const optionRows = rawOptions as Option[];
      const optionsByQuestion: Record<string, Option[]> = {};
      questionIds.forEach((qid) => {
        optionsByQuestion[qid] = [];
      });
      optionRows.forEach((opt) => {
        if (optionsByQuestion[opt.question_id]) {
          optionsByQuestion[opt.question_id].push(opt);
        }
      });

      // 5) Combine each question with its options
      const combined: QuestionWithOptions[] = typedQuestions.map((q) => ({
        ...q,
        options: optionsByQuestion[q.id] || [],
      }));

      setQuestions(combined);
      setLoading(false);
    }

    loadQuiz();
  }, [quizId]);

  // ─── Handlers for Student Answers ─────────────────────────────────────────────────

  // Short‐answer input
  function handleShortAnswerChange(questionId: string, text: string) {
    setAnswers((prev) => {
      const idx = prev.findIndex((a) => a.questionId === questionId);
      if (idx === -1) {
        return [...prev, { questionId, answerText: text }];
      } else {
        const updated = { questionId, answerText: text };
        return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
      }
    });
  }

  // Single‐choice (radio)
  function handleSingleChoiceChange(questionId: string, selectedId: string) {
    setAnswers((prev) => {
      const filtered = prev.filter((a) => a.questionId !== questionId);
      return [...filtered, { questionId, selectedOptionIds: [selectedId] }];
    });
  }

  // Multiple‐choice (checkbox)
  function handleMultipleChoiceChange(
    questionId: string,
    optionId: string,
    checked: boolean
  ) {
    setAnswers((prev) => {
      const idx = prev.findIndex((a) => a.questionId === questionId);
      if (idx === -1) {
        return [
          ...prev,
          { questionId, selectedOptionIds: checked ? [optionId] : [] },
        ];
      } else {
        const existing = prev[idx] as {
          questionId: string;
          selectedOptionIds: string[];
        };
        let newSelected = [...existing.selectedOptionIds];
        if (checked) {
          if (!newSelected.includes(optionId)) newSelected.push(optionId);
        } else {
          newSelected = newSelected.filter((id) => id !== optionId);
        }
        const updated = { questionId, selectedOptionIds: newSelected };
        return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
      }
    });
  }

  // ─── Submit Quiz ───────────────────────────────────────────────────────────────────

  async function handleSubmitQuiz(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    // 1) Create a new quiz_attempt row (using "score" instead of "total_score")
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg("Please sign in before taking the quiz.");
      setSubmitting(false);
      return;
    }

    const { data: attemptRow, error: attemptError } = await supabase
      .from("quiz_attempts")
      .insert({
        quiz_id: quizId,
        user_id: user.id,
        started_at: new Date().toISOString(),
        score: 0,
        passed: false,
      })
      .select("id")
      .single();

    if (attemptError || !attemptRow) {
      console.error("Error creating attempt:", attemptError);
      setErrorMsg("Failed to start quiz attempt.");
      setSubmitting(false);
      return;
    }
    const attemptId = attemptRow.id;

    // 2) Grade each answer as we insert into question_responses
    let correctCount = 0;

    for (const ans of answers) {
      const questionObj = questions.find((q) => q.id === ans.questionId);
      if (!questionObj) continue;

      if ("answerText" in ans) {
        // short_answer → automatically incorrect
        await supabase.from("question_responses").insert({
          attempt_id: attemptId,
          question_id: ans.questionId,
          answer_text: ans.answerText,
          is_correct: false,
          points_awarded: 0, // your column name
        });
      } else {
        // multiple_choice / true_false
        const correctOptionIds = questionObj.options
          .filter((opt) => opt.is_correct)
          .map((opt) => opt.id)
          .sort();
        const selectedOptionIds = (
          ans as {
            questionId: string;
            selectedOptionIds: string[];
          }
        ).selectedOptionIds.sort();

        const isExactMatch =
          selectedOptionIds.length === correctOptionIds.length &&
          selectedOptionIds.every((val, idx) => val === correctOptionIds[idx]);

        for (const optId of ans.selectedOptionIds) {
          const wasCorrect = questionObj.options.find(
            (o) => o.id === optId
          )?.is_correct;
          await supabase.from("question_responses").insert({
            attempt_id: attemptId,
            question_id: ans.questionId,
            selected_option_id: optId,
            is_correct: !!wasCorrect,
            points_awarded: wasCorrect ? 1 : 0,
          });
        }

        if (isExactMatch) {
          correctCount += 1;
        }
      }
    }

    // 3) Compute final score & passed boolean
    const { data: quizMeta, error: quizMetaError } = await supabase
      .from("quizzes")
      .select("passing_score")
      .eq("id", quizId)
      .single();

    let passed = false;
    const totalScore = correctCount;
    if (!quizMetaError && quizMeta) {
      passed = correctCount >= quizMeta.passing_score;
    }

    // 4) Update quiz_attempt with finished_at, score, passed
    await supabase
      .from("quiz_attempts")
      .update({
        finished_at: new Date().toISOString(),
        score: totalScore,
        passed,
      })
      .eq("id", attemptId);

    setSubmitting(false);

    // 5) Redirect back to the course page
    router.push(`/courses/${courseId}`);
  }

  if (loading) {
    return <p className="p-6 text-center text-gray-600">Loading quiz…</p>;
  }
  if (errorMsg) {
    return <p className="p-6 text-center text-red-600">{errorMsg}</p>;
  }

  return (
    <form
      onSubmit={handleSubmitQuiz}
      className="space-y-6 p-6 bg-white rounded-lg shadow"
    >
      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          {/* Render the prompt HTML */}
          <div
            className="prose prose-sm"
            dangerouslySetInnerHTML={{ __html: q.prompt_html }}
          />

          {/* Short‐Answer */}
          {q.question_type === "short_answer" && (
            <input
              type="text"
              placeholder="Your answer…"
              className="w-full border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleShortAnswerChange(q.id, e.target.value)
              }
            />
          )}

          {/* Multiple‐Choice / True‐False */}
          {(q.question_type === "multiple_choice" ||
            q.question_type === "true_false") && (
            <div className="space-y-1">
              {q.options.map((opt) => {
                const isMultiple = q.question_type === "multiple_choice";
                return (
                  <label
                    key={opt.id}
                    className="flex items-center space-x-2 text-sm"
                  >
                    <input
                      type={isMultiple ? "checkbox" : "radio"}
                      name={`question-${q.id}`}
                      value={opt.id}
                      onChange={(e) =>
                        isMultiple
                          ? handleMultipleChoiceChange(
                              q.id,
                              opt.id,
                              e.target.checked
                            )
                          : handleSingleChoiceChange(q.id, opt.id)
                      }
                      className="form-checkbox h-4 w-4 text-green-600"
                    />
                    <span>{opt.text}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={submitting}
        className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit Quiz"}
      </button>
    </form>
  );
}
