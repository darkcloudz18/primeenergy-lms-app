// src/app/courses/[courseId]/modules/[moduleId]/quiz/[quizId]/QuizPageClient.tsx
"use client";

import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Question, Option } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";

type QuestionWithOptions = Question & { options: Option[] };

interface RawQuestionRow {
  id: string;
  quiz_id: string;
  prompt_html: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  ordering: number;
  created_at: string;
}

type StudentAnswer =
  | { questionId: string; answerText: string }
  | { questionId: string; selectedOptionIds: string[] };

interface Props {
  // Prefix unused prop with underscore to silence ESLint if you don't use it.
  quizId: string;
  nextPathIfPassed?: string;
  prevPath?: string;
}

export default function QuizPageClient({
  quizId,
  nextPathIfPassed,
  prevPath,
}: Props) {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [passed, setPassed] = useState<boolean | null>(null); // show pass/fail state

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorMsg(null);

      // Load questions for this quiz
      const { data: rawQuestions, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("id, quiz_id, prompt_html, type, ordering, created_at")
        .eq("quiz_id", quizId)
        .order("ordering", { ascending: true });

      if (questionsError || !rawQuestions) {
        setErrorMsg("Failed to load quiz questions.");
        setLoading(false);
        return;
      }

      const typedQuestions: Question[] = (rawQuestions as RawQuestionRow[]).map(
        (raw) => ({
          id: raw.id,
          quiz_id: raw.quiz_id,
          prompt_html: raw.prompt_html,
          question_type: raw.type,
          ordering: raw.ordering,
          created_at: raw.created_at,
        })
      );

      const qIds = typedQuestions.map((q) => q.id);
      const { data: rawOptions, error: optionsError } = await supabase
        .from("quiz_options")
        .select("id, question_id, text, is_correct, ordering, created_at")
        .in("question_id", qIds)
        .order("ordering", { ascending: true });

      if (optionsError || !rawOptions) {
        setErrorMsg("Failed to load quiz options.");
        setLoading(false);
        return;
      }

      const optionRows = rawOptions as Option[];
      const byQ: Record<string, Option[]> = {};
      qIds.forEach((id) => (byQ[id] = []));
      optionRows.forEach((opt) => {
        if (byQ[opt.question_id]) byQ[opt.question_id].push(opt);
      });

      const combined: QuestionWithOptions[] = typedQuestions.map((q) => ({
        ...q,
        options: byQ[q.id] || [],
      }));

      setQuestions(combined);
      setLoading(false);
    })();
  }, [quizId]);

  function handleShortAnswerChange(questionId: string, text: string) {
    setAnswers((prev) => {
      const idx = prev.findIndex((a) => a.questionId === questionId);
      if (idx === -1) return [...prev, { questionId, answerText: text }];
      const updated = { questionId, answerText: text };
      return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
    });
  }

  function handleSingleChoiceChange(questionId: string, selectedId: string) {
    setAnswers((prev) => {
      const filtered = prev.filter((a) => a.questionId !== questionId);
      return [...filtered, { questionId, selectedOptionIds: [selectedId] }];
    });
  }

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
      }
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
    });
  }

  async function handleSubmitQuiz(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErrorMsg("Please sign in before taking the quiz.");
        setSubmitting(false);
        return;
      }

      // Start attempt
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
        setErrorMsg("Failed to start quiz attempt.");
        setSubmitting(false);
        return;
      }
      const attemptId = attemptRow.id;

      // Grade & store responses
      let correctCount = 0;

      for (const ans of answers) {
        const questionObj = questions.find((q) => q.id === ans.questionId);
        if (!questionObj) continue;

        if ("answerText" in ans) {
          // short_answer: store as incorrect (no auto grading)
          await supabase.from("question_responses").insert({
            attempt_id: attemptId,
            question_id: ans.questionId,
            answer_text: ans.answerText,
            is_correct: false,
            points_awarded: 0,
          });
        } else {
          const correctOptionIds = questionObj.options
            .filter((o) => o.is_correct)
            .map((o) => o.id)
            .sort();
          const selectedIds = [...ans.selectedOptionIds].sort();

          const exact =
            selectedIds.length === correctOptionIds.length &&
            selectedIds.every((v, i) => v === correctOptionIds[i]);

          for (const optId of ans.selectedOptionIds) {
            const wasCorrect =
              questionObj.options.find((o) => o.id === optId)?.is_correct ??
              false;
            await supabase.from("question_responses").insert({
              attempt_id: attemptId,
              question_id: ans.questionId,
              selected_option_id: optId,
              is_correct: wasCorrect,
              points_awarded: wasCorrect ? 1 : 0,
            });
          }

          if (exact) correctCount += 1;
        }
      }

      // Fetch passing score
      const { data: quizMeta, error: quizMetaError } = await supabase
        .from("quizzes")
        .select("passing_score")
        .eq("id", quizId)
        .single();

      const passingScore =
        !quizMetaError && quizMeta ? quizMeta.passing_score : 0;

      const didPass = correctCount >= passingScore;
      setPassed(didPass);

      // Close attempt
      await supabase
        .from("quiz_attempts")
        .update({
          finished_at: new Date().toISOString(),
          score: correctCount,
          passed: didPass,
        })
        .eq("id", attemptId);

      // If passed and there’s a “next” path, go there; otherwise stay and show result
      if (didPass && nextPathIfPassed) {
        router.replace(nextPathIfPassed);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unexpected error submitting quiz.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return <p className="p-6 text-center text-gray-600">Loading quiz…</p>;
  if (errorMsg)
    return <p className="p-6 text-center text-red-600">{errorMsg}</p>;

  return (
    <form
      onSubmit={handleSubmitQuiz}
      className="space-y-6 p-6 bg-white rounded-lg shadow"
    >
      {passed === true && (
        <div className="p-4 rounded bg-green-50 text-green-700">
          ✅ Passed! {nextPathIfPassed ? "Continuing…" : "You can continue."}
        </div>
      )}
      {passed === false && (
        <div className="p-4 rounded bg-red-50 text-red-700">
          ❌ Not passed. Review the lessons and try again.
        </div>
      )}

      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <div
            className="prose prose-sm"
            dangerouslySetInnerHTML={{ __html: q.prompt_html }}
          />

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
                              e.currentTarget.checked
                            )
                          : handleSingleChoiceChange(q.id, opt.id)
                      }
                      className="h-4 w-4"
                    />
                    <span>{opt.text}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-3">
        {prevPath && (
          <button
            type="button"
            onClick={() => router.push(prevPath)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            ← Previous
          </button>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit Quiz"}
        </button>

        {/* If failed, let them try again (stays on this page) */}
        {passed === false && (
          <button
            type="button"
            onClick={() => {
              setAnswers([]);
              setPassed(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retake Quiz
          </button>
        )}

        {nextPathIfPassed && (
          <button
            type="button"
            onClick={() => router.push(nextPathIfPassed)}
            className="ml-auto px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Next →
          </button>
        )}
      </div>
    </form>
  );
}
