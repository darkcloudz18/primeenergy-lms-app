// src/components/QuizForm.tsx
"use client";

import React, { useState, FormEvent } from "react";

export interface QuizFormData {
  title: string;
  description: string;
  passing_score: number;
  questions: QuizQuestionData[];
}

export interface QuizQuestionData {
  prompt_html: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  options: QuizOptionData[];
}

export interface QuizOptionData {
  text: string;
  is_correct: boolean;
}

export interface QuizFormProps {
  initialQuiz: QuizFormData;
  onSubmit: (quizData: QuizFormData) => void;
  onCancel: () => void;
}

export default function QuizForm({
  initialQuiz,
  onSubmit,
  onCancel,
}: QuizFormProps) {
  const [title, setTitle] = useState(initialQuiz.title);
  const [description, setDescription] = useState(initialQuiz.description);
  const [passingScore, setPassingScore] = useState(initialQuiz.passing_score);
  const [questions, setQuestions] = useState<QuizQuestionData[]>(
    initialQuiz.questions || []
  );
  const [errors, setErrors] = useState<string | null>(null);

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { prompt_html: "", type: "multiple_choice", options: [] },
    ]);
  }

  function removeQuestion(qIdx: number) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== qIdx));
  }

  function moveQuestion(qIdx: number, dir: "up" | "down") {
    setQuestions((prev) => {
      const next = [...prev];
      const target = dir === "up" ? qIdx - 1 : qIdx + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[qIdx], next[target]] = [next[target], next[qIdx]];
      return next;
    });
  }

  function updateQuestionField<K extends keyof QuizQuestionData>(
    qIdx: number,
    field: K,
    value: QuizQuestionData[K]
  ) {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIdx) return q;
        // If switching type, enforce options shape
        if (field === "type") {
          const t = value as QuizQuestionData["type"];
          if (t === "true_false") {
            // Normalize to two options True/False, default True correct
            return {
              ...q,
              type: t,
              options: [
                { text: "True", is_correct: true },
                { text: "False", is_correct: false },
              ],
            };
          }
          if (t === "short_answer") {
            // Strip options
            return { ...q, type: t, options: [] };
          }
          // multiple_choice keeps current options
          return { ...q, type: t };
        }
        return { ...q, [field]: value };
      })
    );
  }

  function addOption(qIdx: number) {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qIdx
          ? { ...q, options: [...q.options, { text: "", is_correct: false }] }
          : q
      )
    );
  }

  function removeOption(qIdx: number, oIdx: number) {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qIdx
          ? {
              ...q,
              options: q.options.filter((_, i2) => i2 !== oIdx),
            }
          : q
      )
    );
  }

  function updateOptionField<K extends keyof QuizOptionData>(
    qIdx: number,
    oIdx: number,
    field: K,
    value: QuizOptionData[K]
  ) {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIdx) return q;

        // For true/false, enforce single correct via radio behavior
        if (q.type === "true_false" && field === "is_correct" && value) {
          return {
            ...q,
            options: q.options.map((opt, oi) => ({
              ...opt,
              is_correct: oi === oIdx,
            })),
          };
        }

        return {
          ...q,
          options: q.options.map((opt, oi) =>
            oi === oIdx ? { ...opt, [field]: value } : opt
          ),
        };
      })
    );
  }

  function validate(): string | null {
    if (!title.trim()) return "Quiz title is required.";
    if (passingScore < 0 || passingScore > 100)
      return "Passing score must be between 0 and 100.";
    if (questions.length === 0) return "Add at least one question.";

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt_html.trim())
        return `Question ${i + 1}: prompt is required.`;

      if (q.type === "multiple_choice") {
        if (q.options.length < 2)
          return `Question ${i + 1}: add at least two options.`;
        const hasCorrect = q.options.some((o) => o.is_correct);
        if (!hasCorrect)
          return `Question ${i + 1}: mark at least one option as correct.`;
        const empty = q.options.some((o) => !o.text.trim());
        if (empty) return `Question ${i + 1}: option text cannot be empty.`;
      }

      if (q.type === "true_false") {
        if (q.options.length !== 2)
          return `Question ${
            i + 1
          }: must have exactly two options (True/False).`;
        const labels = q.options.map((o) => o.text.trim().toLowerCase());
        if (!labels.includes("true") || !labels.includes("false"))
          return `Question ${i + 1}: options must be "True" and "False".`;
        const correctCount = q.options.filter((o) => o.is_correct).length;
        if (correctCount !== 1)
          return `Question ${i + 1}: choose exactly one correct answer.`;
      }
    }

    return null;
  }

  function normalizeForSubmit(): QuizFormData {
    const normQuestions = questions.map((q) => {
      const base = {
        prompt_html: q.prompt_html.trim(),
        type: q.type,
        options: q.options,
      };
      if (q.type === "short_answer") {
        return { ...base, options: [] };
      }
      if (q.type === "multiple_choice") {
        // trim text, drop empty options just in case
        const opts = q.options
          .map((o) => ({ text: o.text.trim(), is_correct: o.is_correct }))
          .filter((o) => o.text.length > 0);
        return { ...base, options: opts };
      }
      if (q.type === "true_false") {
        // lock True/False text
        const opts: QuizOptionData[] = [
          {
            text: "True",
            is_correct:
              q.options.find((o) => o.text.toLowerCase() === "true")
                ?.is_correct ?? true,
          },
          {
            text: "False",
            is_correct:
              q.options.find((o) => o.text.toLowerCase() === "false")
                ?.is_correct ?? false,
          },
        ];
        return { ...base, options: opts };
      }
      return base;
    });

    return {
      title: title.trim(),
      description: description,
      passing_score: passingScore,
      questions: normQuestions,
    };
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors(null);

    const err = validate();
    if (err) {
      setErrors(err);
      return;
    }
    onSubmit(normalizeForSubmit());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors && (
        <div className="rounded border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">
          {errors}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Quiz Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 w-full border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description (optional)
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Passing Score
        </label>
        <input
          type="number"
          min={0}
          max={100}
          value={passingScore}
          onChange={(e) => setPassingScore(Number(e.target.value))}
          required
          className="mt-1 w-24 border-gray-300 rounded px-3 py-2"
        />
      </div>

      {/* ─── Questions ─────────────────────────────────── */}
      <div className="space-y-6">
        {questions.map((q, qIdx) => (
          <div
            key={qIdx}
            className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Question {qIdx + 1}</h4>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => moveQuestion(qIdx, "up")}
                  className="text-gray-600 hover:underline disabled:text-gray-300"
                  disabled={qIdx === 0}
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => moveQuestion(qIdx, "down")}
                  className="text-gray-600 hover:underline disabled:text-gray-300"
                  disabled={qIdx === questions.length - 1}
                >
                  Down
                </button>
                <button
                  type="button"
                  onClick={() => removeQuestion(qIdx)}
                  className="text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>

            {/* Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Prompt (HTML)
              </label>
              <textarea
                rows={2}
                value={q.prompt_html}
                onChange={(e) =>
                  updateQuestionField(qIdx, "prompt_html", e.target.value)
                }
                className="mt-1 w-full border-gray-300 rounded px-3 py-2"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                value={q.type}
                onChange={(e) =>
                  updateQuestionField(
                    qIdx,
                    "type",
                    e.target.value as QuizQuestionData["type"]
                  )
                }
                className="mt-1 w-40 border-gray-300 rounded px-3 py-2"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True / False</option>
                <option value="short_answer">Short Answer</option>
              </select>
            </div>

            {/* Options */}
            {q.type === "multiple_choice" && (
              <div className="space-y-2">
                <h5 className="font-medium">Options</h5>
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) =>
                        updateOptionField(qIdx, oIdx, "text", e.target.value)
                      }
                      placeholder="Option text"
                      required
                      className="flex-1 border-gray-300 rounded px-3 py-2"
                    />
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={opt.is_correct}
                        onChange={(e) =>
                          updateOptionField(
                            qIdx,
                            oIdx,
                            "is_correct",
                            e.target.checked
                          )
                        }
                      />
                      <span className="text-sm">Correct</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeOption(qIdx, oIdx)}
                      className="text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addOption(qIdx)}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                >
                  + Add Option
                </button>
              </div>
            )}

            {q.type === "true_false" && (
              <div className="space-y-2">
                <h5 className="font-medium">Answer</h5>
                {[{ label: "True" }, { label: "False" }].map((o, oIdx) => (
                  <label key={o.label} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`tf-${qIdx}`}
                      checked={
                        q.options[oIdx]?.text.toLowerCase() ===
                          o.label.toLowerCase() &&
                        q.options[oIdx]?.is_correct === true
                      }
                      onChange={() =>
                        updateOptionField(qIdx, oIdx, "is_correct", true)
                      }
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
                <p className="text-xs text-gray-500">
                  Exactly one must be correct.
                </p>
              </div>
            )}
            {/* short_answer → no options */}
          </div>
        ))}

        <button
          type="button"
          onClick={addQuestion}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Question
        </button>
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Save Quiz
        </button>
      </div>
    </form>
  );
}
