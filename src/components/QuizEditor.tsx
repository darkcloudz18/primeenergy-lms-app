"use client";

import { useEffect, useState } from "react";

type QType = "multiple_choice" | "true_false" | "short_answer";

export type EditorOption = {
  id?: string;
  text: string;
  is_correct: boolean;
  ordering: number;
};

export type EditorQuestion = {
  id?: string;
  prompt_html: string;
  type: QType;
  ordering: number;
  options: EditorOption[]; // empty for short_answer
};

export type EditorQuiz = {
  id?: string;
  course_id: string;
  module_id?: string | null; // null for final quiz
  title: string;
  passing_score: number;
  description?: string | null;
};

interface Props {
  initialQuiz: EditorQuiz;
  initialQuestions: EditorQuestion[];
  /** Always pass these from the page so we can enforce them at save time */
  courseId: string;
  moduleId: string | null; // null for final quiz
  /** Optional: where to go after save. If omitted, we auto-detect tutor vs admin. */
  afterSaveBase?: "/admin" | "/dashboard/tutor";
}

export default function QuizEditor({
  initialQuiz,
  initialQuestions,
  courseId,
  moduleId,
  afterSaveBase,
}: Props) {
  const [quiz, setQuiz] = useState<EditorQuiz>(initialQuiz);
  const [questions, setQuestions] =
    useState<EditorQuestion[]>(initialQuestions);
  const [saving, setSaving] = useState(false);

  // Keep authoritative ids in state
  useEffect(() => {
    setQuiz((q) => ({
      ...q,
      course_id: courseId,
      module_id: moduleId ?? null,
    }));
  }, [courseId, moduleId]);

  function addQuestion(type: QType) {
    const ordering = questions.length + 1;
    const base: EditorQuestion = {
      prompt_html: "",
      type,
      ordering,
      options: [],
    };
    if (type === "multiple_choice") {
      base.options = [
        { text: "Option 1", is_correct: true, ordering: 1 },
        { text: "Option 2", is_correct: false, ordering: 2 },
      ];
    } else if (type === "true_false") {
      base.options = [
        { text: "True", is_correct: true, ordering: 1 },
        { text: "False", is_correct: false, ordering: 2 },
      ];
    }
    setQuestions((q) => [...q, base]);
  }

  function removeQuestion(idx: number) {
    setQuestions((q) =>
      q.filter((_, i) => i !== idx).map((it, i) => ({ ...it, ordering: i + 1 }))
    );
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    setQuestions((q) => {
      const arr = [...q];
      const ni = idx + dir;
      if (ni < 0 || ni >= arr.length) return q;
      [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
      return arr.map((it, i) => ({ ...it, ordering: i + 1 }));
    });
  }

  function addOption(qi: number) {
    setQuestions((qs) => {
      const copy = [...qs];
      const q = copy[qi];
      if (q.type === "short_answer") return qs;
      const ordering = (q.options?.length ?? 0) + 1;
      q.options = [
        ...(q.options ?? []),
        { text: "New option", is_correct: false, ordering },
      ];
      copy[qi] = { ...q };
      return copy;
    });
  }

  function removeOption(qi: number, oi: number) {
    setQuestions((qs) => {
      const copy = [...qs];
      const q = copy[qi];
      q.options = (q.options ?? [])
        .filter((_, i) => i !== oi)
        .map((op, i) => ({ ...op, ordering: i + 1 }));
      copy[qi] = { ...q };
      return copy;
    });
  }

  function setCorrectSingle(qi: number, oi: number) {
    setQuestions((qs) => {
      const copy = [...qs];
      const q = copy[qi];
      if (q.type !== "short_answer") {
        q.options = (q.options ?? []).map((op, i) => ({
          ...op,
          is_correct: i === oi,
        }));
      }
      copy[qi] = { ...q };
      return copy;
    });
  }

  async function saveAll() {
    setSaving(true);
    try {
      const payload = {
        quiz: {
          id: quiz.id,
          course_id: quiz.course_id,
          module_id: quiz.module_id ?? null,
          title: quiz.title,
          passing_score: quiz.passing_score,
          // description: quiz.description ?? null, // add if you expose it
        },
        questions: questions.map((q, i) => ({
          prompt_html: q.prompt_html,
          type: q.type,
          ordering: i + 1,
          options:
            q.type === "short_answer"
              ? []
              : (q.options ?? []).map((op, j) => ({
                  text: op.text,
                  is_correct: !!op.is_correct,
                  ordering: j + 1,
                })),
        })),
      };

      const res = await fetch("/api/admin/quizzes/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const j = await res.json();
      if (!res.ok || j?.error) throw new Error(j?.error || "Save failed");

      if (j.quiz?.id) setQuiz((q) => ({ ...q, id: j.quiz.id }));
      if (Array.isArray(j.questions)) setQuestions(j.questions);

      // ✅ Redirect to the correct space
      let base = afterSaveBase;
      if (!base) {
        const path =
          typeof window !== "undefined" ? window.location.pathname : "";
        base = path.includes("/dashboard/tutor/")
          ? "/dashboard/tutor"
          : "/admin";
      }
      window.location.href = `${base}/courses/edit/${quiz.course_id}`;
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="text-xl font-semibold">
          {moduleId ? "Module Quiz" : "Final Quiz"}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Title</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={quiz.title}
              onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
              placeholder="Quiz title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Passing Score</label>
            <input
              type="number"
              className="mt-1 w-full border rounded px-3 py-2"
              value={quiz.passing_score}
              onChange={(e) =>
                setQuiz({ ...quiz, passing_score: Number(e.target.value || 0) })
              }
              min={0}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addQuestion("multiple_choice")}
            className="px-3 py-2 bg-blue-600 text-white rounded"
          >
            + Multiple Choice
          </button>
          <button
            type="button"
            onClick={() => addQuestion("true_false")}
            className="px-3 py-2 bg-indigo-600 text-white rounded"
          >
            + True/False
          </button>
          <button
            type="button"
            onClick={() => addQuestion("short_answer")}
            className="px-3 py-2 bg-emerald-600 text-white rounded"
          >
            + Short Answer
          </button>
        </div>

        {questions.length === 0 ? (
          <p className="text-gray-600">No questions yet.</p>
        ) : (
          <ol className="space-y-6">
            {questions.map((q, qi) => (
              <li key={q.id ?? `q-${qi}`} className="border rounded p-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-6 text-right">
                      {q.ordering}.
                    </span>
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={q.type}
                      onChange={(e) => {
                        const type = e.target.value as QType;
                        setQuestions((qs) => {
                          const copy = [...qs];
                          const next = { ...copy[qi], type };
                          if (type === "short_answer") next.options = [];
                          if (type === "true_false") {
                            next.options = [
                              { text: "True", is_correct: true, ordering: 1 },
                              { text: "False", is_correct: false, ordering: 2 },
                            ];
                          }
                          if (
                            type === "multiple_choice" &&
                            next.options.length === 0
                          ) {
                            next.options = [
                              {
                                text: "Option 1",
                                is_correct: true,
                                ordering: 1,
                              },
                              {
                                text: "Option 2",
                                is_correct: false,
                                ordering: 2,
                              },
                            ];
                          }
                          copy[qi] = next;
                          return copy;
                        });
                      }}
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="true_false">True/False</option>
                      <option value="short_answer">Short Answer</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveQuestion(qi, -1)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(qi, 1)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(qi)}
                      className="px-2 py-1 border rounded text-sm text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <label className="block text-sm font-medium mt-3">
                  Prompt (HTML allowed)
                </label>
                <textarea
                  className="mt-1 w-full border rounded px-3 py-2"
                  rows={3}
                  value={q.prompt_html}
                  onChange={(e) => {
                    const v = e.target.value;
                    setQuestions((qs) => {
                      const copy = [...qs];
                      copy[qi] = { ...copy[qi], prompt_html: v };
                      return copy;
                    });
                  }}
                />

                {q.type !== "short_answer" && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Options</span>
                      <button
                        type="button"
                        onClick={() => addOption(qi)}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        + Option
                      </button>
                    </div>

                    {(q.options ?? []).map((op, oi) => (
                      <div
                        key={op.id ?? `op-${qi}-${oi}`}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="radio"
                          name={`correct-${qi}`}
                          checked={!!op.is_correct}
                          onChange={() => setCorrectSingle(qi, oi)}
                          title="Correct"
                        />
                        <input
                          className="flex-1 border rounded px-3 py-2"
                          value={op.text}
                          onChange={(e) => {
                            const v = e.target.value;
                            setQuestions((qs) => {
                              const copy = [...qs];
                              const qq = { ...copy[qi] };
                              qq.options = [...(qq.options ?? [])];
                              qq.options[oi] = { ...qq.options[oi], text: v };
                              copy[qi] = qq;
                              return copy;
                            });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(qi, oi)}
                          className="px-2 py-1 border rounded text-sm text-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={saveAll}
          disabled={saving}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Quiz"}
        </button>
      </div>
    </div>
  );
}
