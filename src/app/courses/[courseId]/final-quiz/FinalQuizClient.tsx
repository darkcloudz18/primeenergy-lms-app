// src/app/courses/[courseId]/final-quiz/FinalQuizClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ----------------------------- types ----------------------------- */

type QType = "multiple_choice" | "true_false" | "short_answer";

type Option = {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  ordering: number | null;
};

type Question = {
  id: string;
  quiz_id: string;
  prompt_html: string;
  question_type: QType;
  ordering: number | null;
};

type ActiveTemplate = {
  id: string;
  name: string;
  image_url: string;
  name_x: number;
  name_y: number;
  course_x: number;
  course_y: number;
  date_x: number;
  date_y: number;
  font_size: number;
  font_color: string;
  is_active: boolean;
};

type ReviewItem = {
  question: Question;
  options: Pick<Option, "id" | "text" | "is_correct">[];
  selectedOptionId: string | null;
  answerText: string | null;
  isCorrect: boolean;
};

export interface Props {
  courseId: string;
  courseTitle?: string;
  /** Server-gated flag; if false we render the lock card. */
  eligible: boolean;
}

/* --------------------------- helpers --------------------------- */

/** Resolve a nice display name for the signed-in user. */
async function fetchDisplayName(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Learner";

  // 1) profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name,last_name,full_name,display_name")
    .eq("id", user.id)
    .maybeSingle();

  const fromProfile =
    profile?.full_name ||
    profile?.display_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();

  if (fromProfile && fromProfile.length > 1) return fromProfile;

  // 2) user_metadata
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const mFirst =
    typeof meta["first_name"] === "string"
      ? (meta["first_name"] as string)
      : "";
  const mLast =
    typeof meta["last_name"] === "string" ? (meta["last_name"] as string) : "";
  const mFull =
    (typeof meta["full_name"] === "string" && (meta["full_name"] as string)) ||
    (typeof meta["name"] === "string" && (meta["name"] as string)) ||
    [mFirst, mLast].filter(Boolean).join(" ").trim();

  if (mFull && mFull.length > 1) return mFull;

  // 3) prettify email local-part
  const pretty =
    user.email
      ?.split("@")[0]
      ?.replace(/\./g, " ")
      ?.replace(/\b\w/g, (c) => c.toUpperCase()) || "Learner";
  return pretty;
}

/* -------------------- certificate preview widget -------------------- */

function CertificatePreview({
  template,
  learnerName,
  courseTitle,
  dateText,
}: {
  template: ActiveTemplate | null;
  learnerName: string;
  courseTitle: string;
  dateText: string;
}) {
  if (!template) {
    return (
      <p className="text-center text-sm text-gray-500 my-3">
        (No active admin certificate template found.)
      </p>
    );
  }
  const baseW = 1200;
  const baseH = 800;

  return (
    <div className="relative w-full max-w-4xl mx-auto aspect-[3/2] rounded-xl overflow-hidden border">
      <Image
        src={template.image_url}
        alt={template.name}
        fill
        className="object-cover"
        priority
      />
      <div
        style={{
          position: "absolute",
          left: `${(template.name_x / baseW) * 100}%`,
          top: `${(template.name_y / baseH) * 100}%`,
          transform: "translate(-50%, -50%)",
          color: template.font_color,
          fontSize: `${template.font_size / 2}px`,
          fontWeight: 700,
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
      >
        {learnerName}
      </div>
      <div
        style={{
          position: "absolute",
          left: `${(template.course_x / baseW) * 100}%`,
          top: `${(template.course_y / baseH) * 100}%`,
          transform: "translate(-50%, -50%)",
          color: template.font_color,
          fontSize: `${Math.max(template.font_size - 6, 24) / 2}px`,
          fontWeight: 500,
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
      >
        {courseTitle}
      </div>
      <div
        style={{
          position: "absolute",
          left: `${(template.date_x / baseW) * 100}%`,
          top: `${(template.date_y / baseH) * 100}%`,
          transform: "translate(-50%, -50%)",
          color: template.font_color,
          fontSize: `${20 / 2}px`,
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
      >
        {dateText}
      </div>
    </div>
  );
}

/* ------------------------------- component ------------------------------ */

export default function FinalQuizClient({
  courseId,
  courseTitle,
  eligible,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  // quiz state
  const [finalQuizId, setFinalQuizId] = useState<string | null>(null);
  const [passingScore, setPassingScore] = useState<number>(0);
  const [questions, setQuestions] = useState<
    (Question & { options: Option[] })[]
  >([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // persisted result (if user already took the final)
  const [result, setResult] = useState<null | {
    passed: boolean;
    score: number;
    passing_score: number;
    certificate_url?: string | null;
    full_name?: string;
  }>(null);

  const [lastAttemptId, setLastAttemptId] = useState<string | null>(null);

  // active certificate template
  const [template, setTemplate] = useState<ActiveTemplate | null>(null);

  // review (failed attempts)
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [review, setReview] = useState<ReviewItem[] | null>(null);

  const LS_KEY = `final_attempt:${courseId}`;

  /* ----------------------------- initial load ----------------------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);

      // who is the user?
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1) identify the final quiz
      const { data: quizRow } = await supabase
        .from("quizzes")
        .select("id, passing_score")
        .eq("course_id", courseId)
        .is("module_id", null)
        .maybeSingle();

      if (!quizRow?.id) {
        if (mounted) {
          setFinalQuizId(null);
          setQuestions([]);
          setLoading(false);
        }
        return;
      }
      if (mounted) {
        setFinalQuizId(quizRow.id);
        setPassingScore(quizRow.passing_score ?? 0);
      }

      // 2) active certificate template (optional)
      const { data: activeTpl } = await supabase
        .from("certificate_templates")
        .select(
          "id,name,image_url,name_x,name_y,course_x,course_y,date_x,date_y,font_size,font_color,is_active"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (mounted) setTemplate(activeTpl ?? null);

      // 3) try to hydrate UI from the **latest attempt**
      let hasAttempt = false;
      if (user) {
        const { data: latest } = await supabase
          .from("quiz_attempts")
          .select("id, score, passed, started_at, finished_at, created_at")
          .eq("user_id", user.id)
          .eq("quiz_id", quizRow.id)
          .order("finished_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latest) {
          const fullName = await fetchDisplayName();

          // optional certificate file (if already issued)
          const { data: cert } = await supabase
            .from("certificates")
            .select("file_url")
            .eq("course_id", courseId)
            .eq("user_id", user.id)
            .maybeSingle();

          if (mounted) {
            setLastAttemptId(latest.id);
            setResult({
              passed: !!latest.passed,
              score: latest.score ?? 0,
              passing_score: quizRow.passing_score ?? 0,
              certificate_url: cert?.file_url ?? null,
              full_name: fullName,
            });
          }

          // also mirror to localStorage
          try {
            localStorage.setItem(
              LS_KEY,
              JSON.stringify({
                attemptId: latest.id,
                passed: !!latest.passed,
                score: latest.score ?? 0,
                passing_score: quizRow.passing_score ?? 0,
                certificate_url: cert?.file_url ?? null,
                full_name: fullName,
              })
            );
          } catch {
            /* ignore */
          }

          hasAttempt = true;
        }
      }

      // 4) if no server attempt, fall back to localStorage
      if (!hasAttempt) {
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as {
              attemptId?: string;
              passed: boolean;
              score: number;
              passing_score: number;
              certificate_url?: string | null;
              full_name?: string;
            };
            if (mounted) {
              setLastAttemptId(parsed.attemptId ?? null);
              setResult(parsed);
            }
            hasAttempt = true;
          }
        } catch {
          /* ignore */
        }
      }

      // 5) Only fetch questions if we don't already have a result
      if (hasAttempt) {
        setLoading(false);
        return;
      }

      const { data: qData } = await supabase
        .from("quiz_questions")
        .select("id, quiz_id, prompt_html, type, ordering")
        .eq("quiz_id", quizRow.id)
        .order("ordering", { ascending: true });

      const full = await Promise.all(
        (qData ?? []).map(async (q) => {
          const question: Question = {
            id: q.id,
            quiz_id: q.quiz_id,
            prompt_html: q.prompt_html,
            question_type: q.type as QType,
            ordering: q.ordering,
          };

          if (question.question_type === "short_answer") {
            return { ...question, options: [] as Option[] };
          }

          const { data: optData } = await supabase
            .from("quiz_options")
            .select("id, question_id, text, is_correct, ordering")
            .eq("question_id", q.id)
            .order("ordering", { ascending: true });

          const options: Option[] =
            (optData ?? []).map((r) => ({
              id: r.id,
              question_id: r.question_id,
              text: r.text,
              is_correct: r.is_correct,
              ordering: r.ordering,
            })) ?? [];

          return { ...question, options };
        })
      );

      if (mounted) setQuestions(full);
      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  /* ------------------------------- submit ------------------------------- */

  const canSubmit = useMemo(() => {
    for (const q of questions) {
      if (q.question_type === "short_answer") continue;
      if (!answers[q.id]) return false;
    }
    return questions.length > 0;
  }, [questions, answers]);

  async function handleSubmit() {
    if (!finalQuizId || !canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const payloadAnswers = questions.map((q) => {
        if (q.question_type === "short_answer") {
          return { question_id: q.id, text: shortAnswers[q.id] ?? "" };
        }
        return { question_id: q.id, option_id: answers[q.id] ?? null };
      });

      const res = await fetch("/api/quizzes/submit-final", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ courseId, answers: payloadAnswers }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Quiz submit failed");

      // Resolve display name
      const fullName = await fetchDisplayName();

      // If passed, try to issue certificate
      let certificate_url: string | null = null;
      if (json.passed === true) {
        const certRes = await fetch("/api/certificates/issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ courseId }),
        });
        const certJson = await certRes.json();
        certificate_url = certRes.ok ? certJson?.url ?? null : null;
      }

      // Find the attempt id we just created (latest finished attempt)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let latestAttemptId: string | null = null;
      if (user && finalQuizId) {
        const { data: latest } = await supabase
          .from("quiz_attempts")
          .select("id, created_at")
          .eq("user_id", user.id)
          .eq("quiz_id", finalQuizId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latest?.id) {
          latestAttemptId = latest.id;
          setLastAttemptId(latest.id);
        }
      }

      const newResult = {
        passed: !!json.passed,
        score: json.score ?? 0,
        passing_score: json.passing_score ?? passingScore,
        certificate_url,
        full_name: fullName,
      };

      // Persist in UI and mirror to localStorage so it "sticks" on reopen
      setResult(newResult);
      try {
        localStorage.setItem(
          LS_KEY,
          JSON.stringify({ attemptId: latestAttemptId, ...newResult })
        );
      } catch {
        /* ignore */
      }

      router.refresh(); // refresh sidebar unlock/progress
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const resetAndRetake = () => {
    setResult(null);
    setAnswers({});
    setShortAnswers({});
    setReviewOpen(false);
    setReview(null);
  };

  /* ---------------------------- review answers ---------------------------- */

  async function loadReview() {
    if (!lastAttemptId || review || reviewLoading) return;
    setReviewLoading(true);
    try {
      // 1) responses for the attempt
      const { data: responses } = await supabase
        .from("question_responses")
        .select("question_id, selected_option_id, answer_text, is_correct")
        .eq("attempt_id", lastAttemptId);

      const qIds = Array.from(
        new Set((responses ?? []).map((r) => r.question_id))
      );
      if (qIds.length === 0) {
        setReview([]);
        return;
      }

      // 2) questions
      const { data: qRows } = await supabase
        .from("quiz_questions")
        .select("id, quiz_id, prompt_html, type, ordering")
        .in("id", qIds);

      const byIdQ = new Map<string, Question>();
      (qRows ?? []).forEach((q) =>
        byIdQ.set(q.id, {
          id: q.id,
          quiz_id: q.quiz_id,
          prompt_html: q.prompt_html,
          question_type: q.type as QType,
          ordering: q.ordering,
        })
      );

      // 3) options
      const { data: optRows } = await supabase
        .from("quiz_options")
        .select("id, question_id, text, is_correct")
        .in("question_id", qIds);

      const optionsByQ = new Map<
        string,
        Pick<Option, "id" | "text" | "is_correct">[]
      >();
      (optRows ?? []).forEach((o) => {
        const arr = optionsByQ.get(o.question_id) ?? [];
        arr.push({ id: o.id, text: o.text, is_correct: !!o.is_correct });
        optionsByQ.set(o.question_id, arr);
      });

      // 4) assemble
      const items: ReviewItem[] = (responses ?? []).map((r) => ({
        question: byIdQ.get(r.question_id)!,
        options: optionsByQ.get(r.question_id) ?? [],
        selectedOptionId: (r.selected_option_id as string | null) ?? null,
        answerText: (r.answer_text as string | null) ?? null,
        isCorrect: !!r.is_correct,
      }));

      setReview(items);
    } finally {
      setReviewLoading(false);
    }
  }

  /* --------------------------------- UI --------------------------------- */

  if (loading) return <p>Loading…</p>;

  if (!eligible) {
    return (
      <div className="p-6 bg-white rounded shadow">
        <p className="text-gray-700">
          🔒 Final exam is locked. Complete <b>all modules</b> (every lesson and
          any module quizzes) to unlock it.
        </p>
        <a
          href={`/courses/${courseId}`}
          className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Course
        </a>
      </div>
    );
  }

  // If we have a persisted attempt, show that instead of a blank quiz
  if (result) {
    const ct = courseTitle ?? "Course";

    if (!result.passed) {
      return (
        <div className="p-6 bg-white rounded shadow space-y-4">
          <p className="text-lg">
            Score: <b>{result.score}</b> / Passing:{" "}
            <b>{result.passing_score}</b>
          </p>
          <p className="text-red-600 font-semibold">
            ❌ You didn’t pass. You can review your answers and retake the final
            exam.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setReviewOpen((v) => {
                  const next = !v;
                  if (next && !review) loadReview();
                  return next;
                });
              }}
              className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
            >
              {reviewOpen ? "Hide review" : "Review answers"}
            </button>

            <button
              onClick={resetAndRetake}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retake Final Exam
            </button>

            <a
              href={`/courses/${courseId}`}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Back to Course
            </a>
          </div>

          {reviewOpen && (
            <div className="mt-4 border rounded p-4">
              {reviewLoading ? (
                <p>Loading review…</p>
              ) : !review || review.length === 0 ? (
                <p className="text-gray-600">No responses found.</p>
              ) : (
                <ol className="space-y-4 list-decimal pl-6">
                  {review.map((item) => (
                    <li key={item.question.id}>
                      <div className="font-medium mb-1">
                        <span
                          dangerouslySetInnerHTML={{
                            __html: item.question.prompt_html,
                          }}
                        />
                      </div>
                      {item.question.question_type !== "short_answer" ? (
                        <ul className="space-y-1">
                          {item.options.map((op) => {
                            const chosen = op.id === item.selectedOptionId;
                            const correct = op.is_correct;
                            return (
                              <li
                                key={op.id}
                                className={`px-2 py-1 rounded ${
                                  correct
                                    ? "bg-green-50"
                                    : chosen
                                    ? "bg-red-50"
                                    : ""
                                }`}
                              >
                                {chosen ? "▶ " : ""}
                                {op.text} {correct ? "✓" : chosen ? "✗" : ""}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="px-2 py-1 rounded bg-gray-50">
                          <span className="text-sm text-gray-600">
                            Your answer:
                          </span>{" "}
                          {item.answerText || <i>(empty)</i>}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      );
    }

    // Passed view + certificate
    const name = result.full_name ?? "Learner";
    const dateText = new Date().toLocaleDateString();

    return (
      <div className="p-6 bg-white rounded shadow space-y-6">
        <p className="text-2xl font-semibold text-green-700">
          🎉 Congratulations{result.full_name ? `, ${result.full_name}` : ""}!
        </p>
        <p className="text-gray-700">
          You passed the final exam for <b>{ct}</b>.
        </p>

        <CertificatePreview
          template={template}
          learnerName={name}
          courseTitle={ct}
          dateText={dateText}
        />

        <div className="flex gap-3">
          {result.certificate_url ? (
            <a
              href={result.certificate_url}
              download
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Download Certificate
            </a>
          ) : null}
          <button
            onClick={resetAndRetake}
            className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
          >
            Retake Final Exam
          </button>
          <a
            href={`/courses/${courseId}`}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Course
          </a>
        </div>
      </div>
    );
  }

  // No existing result – show the test
  if (questions.length === 0) {
    return <p className="text-gray-600">No final quiz available.</p>;
  }

  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <div key={q.id} className="p-4 border rounded-lg">
          <p className="font-medium">
            {q.ordering ?? i + 1}.{" "}
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
        {submitting ? "Submitting…" : "Submit Final Exam"}
      </button>
    </div>
  );
}
