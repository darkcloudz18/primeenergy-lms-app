// src/app/admin/courses/edit/[courseId]/modules/[moduleId]/quiz/[quizId]/page.tsx
export const dynamic = "force-dynamic";

import React from "react";
import QuizEditor, {
  type EditorQuiz,
  type EditorQuestion,
} from "../../../../../../../../../components/QuizEditor";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type QType = "multiple_choice" | "true_false" | "short_answer";

type QuizRow = {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  passing_score: number;
};

type QuestionRow = {
  id: string;
  quiz_id: string;
  prompt_html: string;
  type: QType;
  ordering: number;
};

type OptionRow = {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  ordering: number;
};

interface PageProps {
  params: { courseId: string; moduleId: string; quizId: string };
}

export default async function EditModuleQuizPage({ params }: PageProps) {
  const { courseId, moduleId, quizId } = params;

  // 1) Quiz (ensure it belongs to this module)
  const { data: quiz, error: quizErr } = await supabaseAdmin
    .from("quizzes")
    .select("id, course_id, module_id, title, description, passing_score")
    .eq("id", quizId)
    .maybeSingle<QuizRow>();

  if (quizErr || !quiz || quiz.module_id !== moduleId) {
    return (
      <div className="p-6">
        <p className="text-red-600">
          Error loading quiz
          {quizErr ? `: ${quizErr.message}` : quiz ? " (wrong module)" : ""}
        </p>
      </div>
    );
  }

  // 2) Questions
  const { data: qs, error: qErr } = await supabaseAdmin
    .from("quiz_questions")
    .select("id, quiz_id, prompt_html, type, ordering")
    .eq("quiz_id", quizId)
    .order("ordering", { ascending: true })
    .returns<QuestionRow[]>();

  if (qErr) {
    return (
      <div className="p-6">
        <p className="text-red-600">Error loading questions: {qErr.message}</p>
      </div>
    );
  }

  // 3) Options
  const qIds = (qs ?? []).map((q) => q.id);
  let optsByQ: Record<string, OptionRow[]> = {};
  if (qIds.length > 0) {
    const { data: ops, error: oErr } = await supabaseAdmin
      .from("quiz_options")
      .select("id, question_id, text, is_correct, ordering")
      .in("question_id", qIds)
      .order("ordering", { ascending: true })
      .returns<OptionRow[]>();

    if (oErr) {
      return (
        <div className="p-6">
          <p className="text-red-600">Error loading options: {oErr.message}</p>
        </div>
      );
    }
    optsByQ = (ops ?? []).reduce<Record<string, OptionRow[]>>((acc, op) => {
      (acc[op.question_id] ||= []).push(op);
      return acc;
    }, {});
  }

  // 4) Map to editor props
  const initialQuiz: EditorQuiz = {
    id: quiz.id,
    course_id: quiz.course_id,
    module_id: quiz.module_id, // module quiz → string (not null)
    title: quiz.title,
    passing_score: quiz.passing_score,
  };

  const initialQuestions: EditorQuestion[] = (qs ?? []).map((q) => ({
    id: q.id,
    prompt_html: q.prompt_html,
    type: q.type,
    ordering: q.ordering,
    options: (optsByQ[q.id] ?? []).map((op) => ({
      id: op.id,
      text: op.text,
      is_correct: op.is_correct,
      ordering: op.ordering,
    })),
  }));

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Edit Module Quiz</h1>

      <QuizEditor
        initialQuiz={initialQuiz}
        initialQuestions={initialQuestions}
        courseId={courseId} // <—
        moduleId={moduleId} // <—
      />

      <div className="pt-4">
        <a
          href={`/admin/courses/edit/${courseId}/modules/${moduleId}`}
          className="text-blue-600 hover:underline"
        >
          ← Back to module
        </a>
      </div>
    </main>
  );
}
