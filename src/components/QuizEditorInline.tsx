// src/components/QuizEditorInline.tsx
"use client";

import React from "react";
import type { QuizFormData } from "@/components/QuizForm";

type Props = {
  value: QuizFormData; // controlled value
  onChange: (next: QuizFormData) => void; // called on every edit
  onRemove?: () => void; // optional remove button
  heading?: string; // optional heading text
};

type Q = QuizFormData["questions"][number];

export default function QuizEditorInline({
  value,
  onChange,
  onRemove,
  heading,
}: Props) {
  // ---------- immutable update helpers ----------
  const updateQuiz = (patch: Partial<QuizFormData>) =>
    onChange({ ...value, ...patch });

  const updateQuestion = (qIdx: number, updater: (q: Q) => Q) => {
    const nextQs = value.questions.map((q, i) => (i === qIdx ? updater(q) : q));
    updateQuiz({ questions: nextQs });
  };

  const addQuestion = () => {
    const q: Q = {
      prompt_html: "",
      type: "multiple_choice",
      options: [{ text: "", is_correct: false }],
    };
    updateQuiz({ questions: [...value.questions, q] });
  };

  const removeQuestion = (qIdx: number) => {
    updateQuiz({ questions: value.questions.filter((_, i) => i !== qIdx) });
  };

  const setPrompt = (qIdx: number, html: string) =>
    updateQuestion(qIdx, (q) => ({ ...q, prompt_html: html }));

  const setQuestionType = (
    qIdx: number,
    t: "multiple_choice" | "true_false" | "short_answer"
  ) => {
    updateQuestion(qIdx, (q) => {
      let opts = q.options || [];
      if (t === "true_false") {
        // ensure T/F defaults
        if (opts.length < 2) {
          opts = [
            { text: "True", is_correct: false },
            { text: "False", is_correct: false },
          ];
        }
      }
      if (t === "short_answer") {
        opts = [];
      }
      return { ...q, type: t, options: opts };
    });
  };

  const addOption = (qIdx: number) =>
    updateQuestion(qIdx, (q) => ({
      ...q,
      options: [...(q.options || []), { text: "", is_correct: false }],
    }));

  const removeOption = (qIdx: number, oIdx: number) =>
    updateQuestion(qIdx, (q) => ({
      ...q,
      options: (q.options || []).filter((_, i) => i !== oIdx),
    }));

  const setOptionText = (qIdx: number, oIdx: number, text: string) =>
    updateQuestion(qIdx, (q) => ({
      ...q,
      options: (q.options || []).map((opt, i) =>
        i === oIdx ? { ...opt, text } : opt
      ),
    }));

  const setOptionCorrect = (qIdx: number, oIdx: number, is_correct: boolean) =>
    updateQuestion(qIdx, (q) => ({
      ...q,
      options: (q.options || []).map((opt, i) =>
        i === oIdx ? { ...opt, is_correct } : opt
      ),
    }));

  // ---------- UI ----------
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      {heading && <h4 className="text-lg font-semibold">{heading}</h4>}

      {/* Basics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="block">
          <span className="text-sm text-gray-700">Quiz title</span>
          <input
            type="text"
            value={value.title}
            onChange={(e) => updateQuiz({ title: e.target.value })}
            className="mt-1 w-full border-gray-300 rounded px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-700">Passing score</span>
          <input
            type="number"
            min={0}
            value={value.passing_score}
            onChange={(e) =>
              updateQuiz({ passing_score: Number(e.target.value) })
            }
            className="mt-1 w-full border-gray-300 rounded px-3 py-2"
          />
        </label>

        <div className="md:col-span-3">
          <span className="block text-sm text-gray-700">Description</span>
          <textarea
            rows={2}
            value={value.description}
            onChange={(e) => updateQuiz({ description: e.target.value })}
            className="mt-1 w-full border-gray-300 rounded px-3 py-2"
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {value.questions.map((q, qIdx) => (
          <div
            key={qIdx}
            className="p-4 border rounded-lg bg-gray-50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h5 className="font-medium">Question {qIdx + 1}</h5>
              <button
                type="button"
                onClick={() => removeQuestion(qIdx)}
                className="text-red-600 hover:underline"
              >
                Remove question
              </button>
            </div>

            <label className="block">
              <span className="text-sm text-gray-700">
                Prompt (HTML allowed)
              </span>
              <textarea
                rows={2}
                value={q.prompt_html}
                onChange={(e) => setPrompt(qIdx, e.target.value)}
                className="mt-1 w-full border-gray-300 rounded px-3 py-2"
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-gray-700">Type</span>
                <select
                  value={q.type}
                  onChange={(e) =>
                    setQuestionType(
                      qIdx,
                      e.target.value as
                        | "multiple_choice"
                        | "true_false"
                        | "short_answer"
                    )
                  }
                  className="mt-1 w-full border-gray-300 rounded px-3 py-2"
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                  <option value="short_answer">Short Answer</option>
                </select>
              </label>
            </div>

            {(q.type === "multiple_choice" || q.type === "true_false") && (
              <div className="space-y-2">
                <h6 className="font-medium">Options</h6>
                {(q.options || []).map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) =>
                        setOptionText(qIdx, oIdx, e.target.value)
                      }
                      placeholder="Option text"
                      className="flex-1 border-gray-300 rounded px-3 py-2"
                    />
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={!!opt.is_correct}
                        onChange={(e) =>
                          setOptionCorrect(qIdx, oIdx, e.target.checked)
                        }
                      />
                      Correct
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
                  className="mt-1 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                >
                  + Add option
                </button>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addQuestion}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add question
        </button>
      </div>

      {onRemove && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-red-600 hover:underline"
          >
            Remove this quiz
          </button>
        </div>
      )}
    </div>
  );
}
