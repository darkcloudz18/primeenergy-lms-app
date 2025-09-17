"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import html2canvas from "html2canvas";
import type { Options as H2COptions } from "html2canvas";
import jsPDF from "jspdf";
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
  design_width?: number;   // ← optional
  design_height?: number;  // ← optional
};

type CertificatePreviewProps = {
  template: ActiveTemplate | null;
  learnerName: string;
  courseTitle: string;
  dateText: string;
  containerRef: React.RefObject<HTMLDivElement>;
};

export interface Props {
  courseId: string;
  courseTitle?: string;
  eligible: boolean;
}

/* ------------------------ name resolution ------------------------ */
async function fetchDisplayNameFromApi(): Promise<string> {
  const res = await fetch("/api/users/me/display-name", {
    credentials: "include",
    cache: "no-store",
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error || "Failed to load name");
  return j.displayName as string;
}

/* -------------------- certificate preview widget -------------------- */

function useImageNaturalSize(src?: string) {
  const [wh, setWh] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    if (!src) return;
    const imgEl = new window.Image();
    imgEl.crossOrigin = "anonymous";
    imgEl.onload = () => setWh({
      w: imgEl.naturalWidth || 1600,
      h: imgEl.naturalHeight || 1066,
    });
    imgEl.src = src;
  }, [src]);
  return wh;
}

function CertificatePreview({
  template,
  learnerName,
  courseTitle,
  dateText,
  containerRef,
}: CertificatePreviewProps) {
  if (!template) {
    return (
      <p className="text-center text-sm text-gray-500 my-3">
        (No active certificate template found.)
      </p>
    );
  }

  // natural image size for outer frame/aspect
  const wh = useImageNaturalSize(template.image_url);
  const imgW = wh?.w ?? 1600;
  const imgH = wh?.h ?? 1066;
  const imgRatio = imgW / imgH;

  // ✅ Use the same canvas the template was authored in.
  // If you add design_width/height in DB, we’ll use them; otherwise fall back to natural size.
  const designW = template.design_width ?? imgW;
  const designH = template.design_height ?? imgH;

  const leftPct = (x?: number) =>
    (x !== undefined ? `${(x / designW) * 100}%` : "50%");
  const topPct = (y: number) => `${(y / designH) * 100}%`;

  return (
    <div
      ref={containerRef}
      style={{ aspectRatio: String(imgRatio) }}
      className="relative w-full max-w-4xl mx-auto rounded-xl overflow-hidden border bg-white"
    >
      {/* plain <img> so html2canvas can capture it 1:1 */}
      <img
        src={template.image_url}
        crossOrigin="anonymous"
        alt={template.name}
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: "fill" }}
      />

      {/* Name (centered) */}
      <div
        style={{
          position: "absolute",
          left: leftPct(template.name_x),
          top: topPct(template.name_y),
          transform: "translate(-50%, -50%)", // vertical + horizontal center
          width: "80%",
          color: template.font_color,
          fontSize: `${template.font_size / 2}px`,
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.2,
          whiteSpace: "normal",
        }}
      >
        {learnerName}
      </div>

      {/* Course (centered) */}
      <div
        style={{
          position: "absolute",
          left: leftPct(template.course_x),
          top: topPct(template.course_y),
          transform: "translate(-50%, -50%)",
          width: "80%",
          color: template.font_color,
          fontSize: `${Math.max(template.font_size - 6, 24) / 2}px`,
          fontWeight: 500,
          textAlign: "center",
          lineHeight: 1.2,
          whiteSpace: "normal",
        }}
      >
        {courseTitle}
      </div>

      {/* Date (centered) */}
      <div
        style={{
          position: "absolute",
          left: leftPct(template.date_x),
          top: topPct(template.date_y),
          transform: "translate(-50%, -50%)",
          color: template.font_color,
          fontSize: `${20 / 2}px`,
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {dateText}
      </div>
    </div>
  );
}

/* --------------------------------- main --------------------------------- */

export default function FinalQuizClient({
  courseId,
  courseTitle,
  eligible,
}: Props) {
  const router = useRouter();

  // independent learner name for certificate overlay
  const [displayName, setDisplayName] = useState<string>("Learner");

  // quiz state
  const [loading, setLoading] = useState(true);
  const [finalQuizId, setFinalQuizId] = useState<string | null>(null);
  const [passingScore, setPassingScore] = useState<number>(0);
  const [questions, setQuestions] = useState<
    (Question & { options: Option[] })[]
  >([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // persisted result (do NOT store name here; name is separate)
  const [result, setResult] = useState<null | {
    passed: boolean;
    score: number;
    passing_score: number;
    certificate_url?: string | null;
  }>(null);

  // active certificate template
  const [template, setTemplate] = useState<ActiveTemplate | null>(null);

  // localStorage key for this course
  const LS_KEY = `final_attempt:${courseId}`;

  // Ref for screenshot/PDF (non-null assertion to satisfy RefObject<HTMLDivElement>)
  const certRef = useRef<HTMLDivElement>(null!);

  /* -------------------- resolve display name once -------------------- */

  useEffect(() => {
    fetchDisplayNameFromApi()
      .then((n) => setDisplayName(n || "Learner"))
      .catch(() => setDisplayName("Learner"));
  }, []);

  /* ----------------------------- initial load ----------------------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);

      // 1) final quiz row
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

      // 2) template (optional)
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

      // 3) latest attempt on server
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let hasAttempt = false;
      if (user) {
        const { data: latest } = await supabase
          .from("quiz_attempts")
          .select("score, passed, finished_at, created_at")
          .eq("user_id", user.id)
          .eq("quiz_id", quizRow.id)
          .order("finished_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latest) {
          const next = {
            passed: !!latest.passed,
            score: latest.score ?? 0,
            passing_score: quizRow.passing_score ?? 0,
          };
          if (mounted) {
            setResult(next);
            try {
              localStorage.setItem(LS_KEY, JSON.stringify(next));
            } catch {
              /* ignore */
            }
          }
          hasAttempt = true;
        }
      }

      // 4) localStorage fallback
      if (!hasAttempt) {
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as {
              passed?: boolean;
              score?: number;
              passing_score?: number;
            };
            if (mounted) {
              setResult({
                passed: !!parsed.passed,
                score: parsed.score ?? 0,
                passing_score:
                  parsed.passing_score ?? quizRow.passing_score ?? 0,
              });
              hasAttempt = true;
            }
          }
        } catch {
          /* ignore */
        }
      }

      // 5) fetch questions only if no attempt/result already
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
  }, [courseId, LS_KEY]);

  /* ------------------------------- submit ------------------------------- */

  // ✅ Define canSubmit ONCE here (unconditional)
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

      const json: {
        passed?: boolean;
        score?: number;
        passing_score?: number;
        error?: string;
      } = await res.json();
      if (!res.ok) throw new Error(json?.error || "Quiz submit failed");

      // If passed, try to issue a certificate (optional)
      let certificate_url: string | null = null;
      if (json.passed === true) {
        const certRes = await fetch("/api/certificates/issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ courseId }),
        });
        const certJson: { url?: string; error?: string } = await certRes.json();
        certificate_url = certRes.ok ? certJson?.url ?? null : null;
      }

      const next = {
        passed: !!json.passed,
        score: json.score ?? 0,
        passing_score: json.passing_score ?? passingScore,
        certificate_url,
      };
      setResult(next);

      // mirror status to localStorage (no name)
      try {
        localStorage.setItem(
          LS_KEY,
          JSON.stringify({
            passed: next.passed,
            score: next.score,
            passing_score: next.passing_score,
          })
        );
      } catch {
        /* ignore */
      }

      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  /* ------------------------------ downloads ------------------------------ */

function downloadPNG() {
  const el = certRef.current;
  if (!el) return;
  const opts: Partial<H2COptions> = {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
  };
  html2canvas(el, opts).then((canvas) => {
    const link = document.createElement("a");
    link.download = "certificate.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

function downloadPDF() {
  const el = certRef.current;
  if (!el) return;
  const opts: Partial<H2COptions> = {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
  };
  html2canvas(el, opts).then((canvas) => {
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("landscape", "pt", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;
    pdf.addImage(imgData, "PNG", x, y, w, h);
    pdf.save("certificate.pdf");
  });
}

  /* --------------------------------- UI --------------------------------- */

  if (loading) return <p>Loading…</p>;

  if (!eligible) {
    return (
      <div className="p-6 bg-white rounded shadow">
        <p className="text-gray-700">
          🔒 Final exam is locked. Complete <b>all modules</b> to unlock it.
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

  if (result) {
    const ct = courseTitle ?? "Course";
    const dateText = new Date().toLocaleDateString();

    if (!result.passed) {
      return (
        <div className="p-6 bg-white rounded shadow space-y-4">
          <p className="text-lg">
            Score: <b>{result.score}</b> / Passing:{" "}
            <b>{result.passing_score}</b>
          </p>
          <p className="text-red-600 font-semibold">
            ❌ You didn’t pass. You can retake the final exam.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setResult(null);
                setAnswers({});
                setShortAnswers({});
              }}
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
        </div>
      );
    }

    // Passed — render certificate
    return (
      <div className="p-6 bg-white rounded shadow space-y-6">
        <p className="text-2xl font-semibold text-green-700">
          🎉 Congratulations{displayName ? `, ${displayName}` : ""}!
        </p>
        <p className="text-gray-700">
          You passed the final exam for <b>{ct}</b>.
        </p>

        <CertificatePreview
          template={template}
          learnerName={displayName || "Learner"}
          courseTitle={ct}
          dateText={dateText}
          containerRef={certRef}
        />

        <div className="flex gap-3">
          <button
            onClick={downloadPDF}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Download PDF
          </button>
          <button
            onClick={downloadPNG}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-black"
          >
            Download PNG
          </button>
          {result.certificate_url ? (
            <a
              href={result.certificate_url}
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
              download
            >
              Download (server)
            </a>
          ) : null}
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

  // No result yet → show quiz
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
