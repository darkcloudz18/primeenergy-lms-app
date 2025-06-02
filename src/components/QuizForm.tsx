// src/components/QuizForm.tsx
"use client";

import React, { useState, FormEvent } from "react";

//
// ── Client‐side “Create or Edit Quiz” Form ─────────────────────────────────
//

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

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { prompt_html: "", type: "multiple_choice", options: [] },
    ]);
  }

  function removeQuestion(qIdx: number) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== qIdx));
  }

  function updateQuestionField<K extends keyof QuizQuestionData>(
    qIdx: number,
    field: K,
    value: QuizQuestionData[K]
  ) {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === qIdx ? { ...q, [field]: value } : q))
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
      prev.map((q, idx) =>
        idx === qIdx
          ? {
              ...q,
              options: q.options.map((opt, oi) =>
                oi === oIdx ? { ...opt, [field]: value } : opt
              ),
            }
          : q
      )
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      title,
      description,
      passing_score: passingScore,
      questions,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      {/* ─── Questions List ────────────────────────────────────────────────────── */}
      <div className="space-y-6">
        {questions.map((q, qIdx) => (
          <div
            key={qIdx}
            className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Question {qIdx + 1}</h4>
              <button
                type="button"
                onClick={() => removeQuestion(qIdx)}
                className="text-red-600 hover:underline"
              >
                Remove
              </button>
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

            {/* Options (if applicable) */}
            {(q.type === "multiple_choice" || q.type === "true_false") && (
              <div className="space-y-2">
                <h5 className="font-medium">Options</h5>
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center space-x-2">
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
                    <label className="flex items-center space-x-1">
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
