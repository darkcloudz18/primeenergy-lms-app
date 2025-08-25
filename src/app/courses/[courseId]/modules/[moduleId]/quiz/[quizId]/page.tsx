"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  ChangeEvent,
  FormEvent,
} from "react";
import { useParams } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import LearningShell from "../../lessons/[lessonId]/components/LearningShell";
import type { ModuleWithLessons, Lesson } from "@/lib/types";

/* ======================= Shared Types ======================= */

type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  content: string;
  type: "article" | "video" | "image";
  ordering: number;
  image_url: string | null;
  created_at?: string | null;
};

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
type RawQuestionRow = {
  id: string;
  quiz_id: string;
  prompt_html: string;
  type: string;
  ordering: number | null;
  created_at?: string | null;
};

/* ============================================================
   PAGE WRAPPER: builds sidebar data + prev/next; renders quiz
============================================================ */

export default function ModuleQuizPage() {
  const supabase = useSupabaseClient();
  const params = useParams() as {
    courseId: string;
    moduleId: string;
    quizId: string;
  };
  const { courseId, moduleId, quizId } = params;

  const [modules, setModules] = useState<
    (ModuleWithLessons & { quiz_id?: string })[] | null
  >(null);
  const [finalQuizPath, setFinalQuizPath] = useState<string | undefined>();
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [passedQuizzes, setPassedQuizzes] = useState<string[]>([]);
  const [loadingShell, setLoadingShell] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingShell(true);

      // 1) Modules
      const { data: modulesRaw, error: modulesErr } = await supabase
        .from("modules")
        .select("id, title, ordering, course_id")
        .eq("course_id", courseId)
        .order("ordering", { ascending: true });

      if (modulesErr || !modulesRaw) {
        console.error(modulesErr);
        if (mounted) setLoadingShell(false);
        return;
      }

      // 2) Lessons (typed to your Lesson type; coerce created_at to string)
      const moduleIds = modulesRaw.map((m) => m.id as string);
      let lessonsByModule: Record<string, Lesson[]> = {};
      if (moduleIds.length) {
        const { data: lessonsRaw, error: lessonsErr } = await supabase
          .from("lessons")
          .select(
            "id, module_id, title, content, type, ordering, image_url, created_at"
          )
          .in("module_id", moduleIds)
          .order("ordering", { ascending: true });

        if (lessonsErr) console.error(lessonsErr);

        lessonsByModule = moduleIds.reduce(
          (acc, id) => ({ ...acc, [id]: [] }),
          {}
        );
        (lessonsRaw ?? []).forEach((l) => {
          const r = l as LessonRow;
          const typed: Lesson = {
            id: r.id,
            module_id: r.module_id,
            title: r.title,
            content: r.content,
            type: r.type,
            ordering: r.ordering,
            image_url: r.image_url,
            created_at: r.created_at ?? "",
          };
          lessonsByModule[r.module_id].push(typed);
        });
      }

      // 3) Map module -> quiz
      const { data: moduleQuizzes, error: mqErr } = await supabase
        .from("quizzes")
        .select("id, module_id")
        .eq("course_id", courseId)
        .not("module_id", "is", null);

      if (mqErr) console.error(mqErr);
      const quizByModule: Record<string, string> = {};
      (moduleQuizzes ?? []).forEach((q) => {
        if (q.module_id) quizByModule[q.module_id as string] = q.id;
      });

      // 4) Sidebar modules
      const modulesWithLessons: (ModuleWithLessons & { quiz_id?: string })[] =
        modulesRaw.map((m) => ({
          id: m.id as string,
          title: m.title as string,
          ordering: m.ordering as number,
          lessons: lessonsByModule[m.id as string] || [],
          quiz_id: quizByModule[m.id as string],
        }));

      // 5) Final quiz path if present & has questions
      let fqPath: string | undefined;
      const { data: fq, error: fqErr } = await supabase
        .from("quizzes")
        .select("id")
        .eq("course_id", courseId)
        .is("module_id", null)
        .maybeSingle();

      if (!fqErr && fq?.id) {
        const { count } = await supabase
          .from("quiz_questions")
          .select("id", { head: true, count: "exact" })
          .eq("quiz_id", fq.id);
        if ((count ?? 0) > 0) fqPath = `/courses/${courseId}/final-quiz`;
      }

      // 6) User progress
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;

      if (userId) {
        const { data: lcRows } = await supabase
          .from("lesson_completions")
          .select("lesson_id")
          .eq("user_id", userId);
        const { data: qaRows } = await supabase
          .from("quiz_attempts")
          .select("quiz_id")
          .eq("user_id", userId)
          .eq("passed", true);

        if (mounted) {
          setCompletedLessons((lcRows ?? []).map((r) => r.lesson_id));
          setPassedQuizzes((qaRows ?? []).map((r) => r.quiz_id));
        }
      }

      if (mounted) {
        setModules(modulesWithLessons);
        setFinalQuizPath(fqPath);
        setLoadingShell(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [supabase, courseId]);

  // Prev/Next around this quiz
  const { prevPath, nextPathIfPassed } = useMemo(() => {
    if (!modules) return { prevPath: undefined, nextPathIfPassed: undefined };
    const idx = modules.findIndex((m) => m.id === moduleId);

    let prev: string | undefined;
    if (idx >= 0) {
      const cur = modules[idx];
      const last = cur.lessons[cur.lessons.length - 1];
      if (last)
        prev = `/courses/${courseId}/modules/${cur.id}/lessons/${last.id}`;
      else if (idx > 0) {
        const prevMod = modules[idx - 1];
        const prevLast = prevMod.lessons[prevMod.lessons.length - 1];
        if (prevLast)
          prev = `/courses/${courseId}/modules/${prevMod.id}/lessons/${prevLast.id}`;
      }
    }

    let next: string | undefined;
    if (idx >= 0 && idx < modules.length - 1) {
      const nextMod = modules[idx + 1];
      const first = nextMod.lessons[0];
      if (first)
        next = `/courses/${courseId}/modules/${nextMod.id}/lessons/${first.id}`;
    } else if (finalQuizPath) {
      next = finalQuizPath;
    }

    return { prevPath: prev, nextPathIfPassed: next };
  }, [modules, moduleId, courseId, finalQuizPath]);

  if (loadingShell || !modules) {
    return <p className="p-6 text-center text-gray-600">Loading quiz…</p>;
  }

  return (
    <LearningShell
      courseId={courseId}
      currentModuleId={moduleId}
      currentLessonId="" // we're on a quiz
      modules={modules}
      finalQuizPath={finalQuizPath}
      completedLessons={completedLessons}
      passedQuizzes={passedQuizzes}
    >
      <div className="flex-1 p-6">
        <InnerQuiz
          quizId={quizId}
          prevPath={prevPath}
          nextPathIfPassed={nextPathIfPassed}
          // unlock final/next immediately on pass (updates sidebar state)
          onPassed={() =>
            setPassedQuizzes((prev) =>
              prev.includes(quizId) ? prev : [...prev, quizId]
            )
          }
        />
      </div>
    </LearningShell>
  );
}

/* ============================================================
   INNER QUIZ: loads prior attempt, shows summary, retake, etc.
============================================================ */

function InnerQuiz({
  quizId,
  nextPathIfPassed,
  prevPath,
  onPassed,
}: {
  quizId: string;
  nextPathIfPassed?: string;
  prevPath?: string;
  onPassed?: () => void;
}) {
  const supabase = useSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Questions + answers
  const [questions, setQuestions] = useState<
    (Question & { options: Option[] })[]
  >([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});

  // Result (last attempt)
  const [passingScore, setPassingScore] = useState<number>(0);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastPassed, setLastPassed] = useState<boolean | null>(null);

  // Whether to show the form or just the result panel
  const showForm = lastScore === null && lastPassed === null;

  async function loadQuizAndAttempt() {
    setLoading(true);
    setErrorMsg(null);

    // Quiz meta
    const { data: meta, error: metaErr } = await supabase
      .from("quizzes")
      .select("passing_score")
      .eq("id", quizId)
      .single();

    if (metaErr || !meta) {
      setErrorMsg(metaErr?.message || "Failed to load quiz meta.");
      setLoading(false);
      return;
    }
    setPassingScore(meta.passing_score ?? 0);

    // Questions
    const { data: rawQuestions, error: qErr } = await supabase
      .from("quiz_questions")
      .select("id, quiz_id, prompt_html, type, ordering, created_at")
      .eq("quiz_id", quizId)
      .order("ordering", { ascending: true });

    if (qErr) {
      setErrorMsg(`Failed to load quiz questions: ${qErr.message}`);
      setLoading(false);
      return;
    }

    const typedQuestions: Question[] = (rawQuestions as RawQuestionRow[]).map(
      (r) => ({
        id: r.id,
        quiz_id: r.quiz_id,
        prompt_html: r.prompt_html,
        question_type: r.type as QuestionType,
        ordering: r.ordering,
        created_at: r.created_at ?? undefined,
      })
    );

    const ids = typedQuestions.map((q) => q.id);
    const { data: rawOptions, error: optErr } = await supabase
      .from("quiz_options")
      .select("id, question_id, text, is_correct, ordering, created_at")
      .in("question_id", ids)
      .order("ordering", { ascending: true });

    if (optErr) {
      setErrorMsg(`Failed to load quiz options: ${optErr.message}`);
      setLoading(false);
      return;
    }

    const byQ: Record<string, Option[]> = {};
    ids.forEach((id) => (byQ[id] = []));
    (rawOptions as Option[]).forEach((o) => {
      byQ[o.question_id].push(o);
    });

    setQuestions(
      typedQuestions.map((q) => ({ ...q, options: byQ[q.id] || [] }))
    );

    // Last attempt (if any)
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;

    if (userId) {
      const { data: attempt } = await supabase
        .from("quiz_attempts")
        .select("score, passed, finished_at")
        .eq("quiz_id", quizId)
        .eq("user_id", userId)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (attempt) {
        setLastScore(attempt.score ?? 0);
        setLastPassed(!!attempt.passed);
      } else {
        setLastScore(null);
        setLastPassed(null);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    loadQuizAndAttempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  // Helpers for answer state
  function handleShortChange(qid: string, text: string) {
    setShortAnswers((s) => ({ ...s, [qid]: text }));
  }
  function handleSingleChoice(qid: string, optionId: string) {
    setAnswers((s) => ({ ...s, [qid]: optionId }));
  }
  function handleMultiChoice(qid: string, optionId: string, checked: boolean) {
    const parts = answers[qid]?.split(",").filter(Boolean) ?? [];
    let next = parts;
    if (checked) {
      if (!parts.includes(optionId)) next = [...parts, optionId];
    } else {
      next = parts.filter((id) => id !== optionId);
    }
    setAnswers((s) => ({ ...s, [qid]: next.join(",") }));
  }

  const canSubmit = useMemo(() => {
    if (questions.length === 0) return false;
    for (const q of questions) {
      if (q.question_type === "short_answer") continue;
      if (!answers[q.id]) return false;
    }
    return true;
  }, [questions, answers]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth.user) {
      setErrorMsg("Please sign in before taking the quiz.");
      return;
    }
    const userId = auth.user.id;

    // start attempt
    const { data: attemptRow, error: attemptErr } = await supabase
      .from("quiz_attempts")
      .insert({
        quiz_id: quizId,
        user_id: userId,
        started_at: new Date().toISOString(),
        score: 0,
        passed: false,
      })
      .select("id")
      .single();

    if (attemptErr || !attemptRow) {
      setErrorMsg(attemptErr?.message || "Failed to start quiz attempt.");
      return;
    }
    const attemptId = attemptRow.id as string;

    // grade (score = number of correct questions)
    let correctCount = 0;

    for (const q of questions) {
      if (q.question_type === "short_answer") {
        const text = (shortAnswers[q.id] ?? "").trim();
        await supabase.from("question_responses").insert({
          attempt_id: attemptId,
          question_id: q.id,
          answer_text: text,
          is_correct: false,
          points_awarded: 0,
        });
        continue;
      }

      const selected = (answers[q.id] ?? "").split(",").filter(Boolean);
      const correct = q.options
        .filter((o) => o.is_correct)
        .map((o) => o.id)
        .sort();
      const exact =
        selected.length === correct.length &&
        [...selected].sort().every((id, i) => id === correct[i]);

      // store each selected option
      for (const optId of selected) {
        const wasCorrect = !!q.options.find((o) => o.id === optId)?.is_correct;
        await supabase.from("question_responses").insert({
          attempt_id: attemptId,
          question_id: q.id,
          selected_option_id: optId,
          is_correct: wasCorrect,
          points_awarded: wasCorrect ? 1 : 0,
        });
      }

      if (exact) correctCount += 1;
    }

    const passed = correctCount >= passingScore;

    // finalize attempt
    await supabase
      .from("quiz_attempts")
      .update({
        finished_at: new Date().toISOString(),
        score: correctCount,
        passed,
      })
      .eq("id", attemptId);

    // reflect locally
    setLastScore(correctCount);
    setLastPassed(passed);

    if (passed) onPassed?.();
  }

  function handleRetake() {
    // Clear local result + answers; show the form again
    setLastScore(null);
    setLastPassed(null);
    setAnswers({});
    setShortAnswers({});
  }

  if (loading)
    return <p className="p-6 text-center text-gray-600">Loading quiz…</p>;
  if (errorMsg && showForm === false && lastScore === null) {
    return <p className="p-6 text-center text-red-600">{errorMsg}</p>;
  }

  return (
    <div className="max-w-3xl">
      {/* Form (no previous finished attempt) */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg">
          {questions.map((q, idx) => (
            <div key={q.id} className="space-y-2">
              <div
                className="prose prose-sm"
                dangerouslySetInnerHTML={{
                  __html: `${idx + 1}. ${q.prompt_html}`,
                }}
              />

              {(q.question_type === "multiple_choice" ||
                q.question_type === "true_false") && (
                <div className="space-y-1">
                  {q.options.map((opt) => {
                    const isMultiple = q.question_type === "multiple_choice";
                    const selected = answers[q.id]?.split(",") ?? [];
                    const checked = selected.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className="flex items-center space-x-2 text-sm"
                      >
                        <input
                          type={isMultiple ? "checkbox" : "radio"}
                          name={`q-${q.id}`}
                          value={opt.id}
                          checked={checked}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            isMultiple
                              ? setAnswers((s) => {
                                  const parts =
                                    s[q.id]?.split(",").filter(Boolean) ?? [];
                                  const next = e.target.checked
                                    ? parts.includes(opt.id)
                                      ? parts
                                      : [...parts, opt.id]
                                    : parts.filter((p) => p !== opt.id);
                                  return { ...s, [q.id]: next.join(",") };
                                })
                              : setAnswers((s) => ({ ...s, [q.id]: opt.id }))
                          }
                          className="h-4 w-4 text-green-600"
                        />
                        <span>{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.question_type === "short_answer" && (
                <input
                  type="text"
                  placeholder="Your answer…"
                  className="w-full border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
                  value={shortAnswers[q.id] ?? ""}
                  onChange={(e) =>
                    setShortAnswers((s) => ({ ...s, [q.id]: e.target.value }))
                  }
                />
              )}
            </div>
          ))}

          <div className="flex gap-3">
            {/** previous */}
            {/* If you want a prev link here, pass prevPath down and render it */}
            {/* Example: prevPath && <a href={prevPath} ...>← Previous</a> */}
            <button
              type="submit"
              disabled={
                !questions.length ||
                questions.some(
                  (q) => q.question_type !== "short_answer" && !answers[q.id]
                )
              }
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Submit
            </button>
          </div>
        </form>
      )}

      {/* Result panel (after any finished attempt) */}
      {!showForm && (
        <div className="mt-4 rounded border bg-gray-50 px-4 py-3">
          <div className="text-sm">
            <div>
              <span className="font-medium">Score:</span> {lastScore ?? 0}{" "}
              <span className="text-gray-500">/ Passing: {passingScore}</span>
            </div>
            <div className="mt-1">
              <span className="font-medium">Result:</span>{" "}
              {lastPassed ? (
                <span className="text-green-600">Passed</span>
              ) : (
                <span className="text-red-600">Not passed</span>
              )}
            </div>
          </div>

          <div className="mt-3 flex gap-3">
            {prevPath && (
              <a
                href={prevPath}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                ← Previous
              </a>
            )}

            {!lastPassed && (
              <button
                onClick={handleRetake}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retake
              </button>
            )}

            {lastPassed && nextPathIfPassed && (
              <a
                href={nextPathIfPassed}
                className="ml-auto px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
              >
                Continue →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
