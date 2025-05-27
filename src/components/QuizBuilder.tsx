// src/components/QuizBuilder.tsx
"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import RichTextEditor from "./RichTextEditor";

export type QuestionType = "multiple-choice" | "true-false" | "short-answer";

export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string; // HTML string from RichTextEditor
  options: Option[]; // used by multiple-choice & true-false
  correctAnswer?: string; // used by short-answer
}

interface QuizBuilderProps {
  initialQuestions?: Question[];
  onChange?: (questions: Question[]) => void;
}

export default function QuizBuilder({
  initialQuestions = [],
  onChange,
}: QuizBuilderProps) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);

  const emitChange = (updated: Question[]) => {
    setQuestions(updated);
    onChange?.(updated);
  };

  function addQuestion() {
    const newQ: Question = {
      id: nanoid(),
      type: "multiple-choice",
      prompt: "",
      options: [
        { id: nanoid(), text: "", isCorrect: false },
        { id: nanoid(), text: "", isCorrect: false },
      ],
    };
    emitChange([...questions, newQ]);
  }

  function removeQuestion(idx: number) {
    const next = questions.filter((_, i) => i !== idx);
    emitChange(next);
  }

  function updateQuestion(idx: number, patch: Partial<Question>) {
    const next = questions.map((q, i) => (i === idx ? { ...q, ...patch } : q));
    emitChange(next);
  }

  function addOption(qIdx: number) {
    const q = questions[qIdx];
    const nextOpts = [
      ...q.options,
      { id: nanoid(), text: "", isCorrect: false },
    ];
    updateQuestion(qIdx, { options: nextOpts });
  }

  function removeOption(qIdx: number, oIdx: number) {
    const q = questions[qIdx];
    const nextOpts = q.options.filter((_, i) => i !== oIdx);
    updateQuestion(qIdx, { options: nextOpts });
  }

  function updateOption(qIdx: number, oIdx: number, patch: Partial<Option>) {
    const q = questions[qIdx];
    const nextOpts = q.options.map((o, i) =>
      i === oIdx ? { ...o, ...patch } : o
    );
    updateQuestion(qIdx, { options: nextOpts });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Quiz</h2>

      {questions.map((q, qi) => (
        <div key={q.id} className="border rounded p-4 space-y-4 bg-white">
          <div className="flex justify-between items-center">
            <span className="font-medium">Question {qi + 1}</span>
            <button
              type="button"
              onClick={() => removeQuestion(qi)}
              className="text-red-500 hover:underline text-sm"
            >
              Remove
            </button>
          </div>

          {/* Question Type */}
          <div>
            <label className="block text-gray-700 mb-1">Type</label>
            <select
              value={q.type}
              onChange={(e) =>
                updateQuestion(qi, {
                  type: e.target.value as QuestionType,
                  // reset options/correctAnswer if type changes:
                  options:
                    e.target.value === "true-false"
                      ? [
                          { id: nanoid(), text: "True", isCorrect: false },
                          { id: nanoid(), text: "False", isCorrect: false },
                        ]
                      : q.options,
                  correctAnswer: undefined,
                })
              }
              className="border-gray-300 rounded px-2 py-1"
            >
              <option value="multiple-choice">Multiple Choice</option>
              <option value="true-false">True / False</option>
              <option value="short-answer">Short Answer</option>
            </select>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-gray-700 mb-1">Prompt</label>
            <RichTextEditor
              value={q.prompt}
              onChange={(html) => updateQuestion(qi, { prompt: html })}
            />
          </div>

          {/* Multiple Choice */}
          {q.type === "multiple-choice" && (
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <div key={opt.id} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) =>
                      updateOption(qi, oi, { text: e.target.value })
                    }
                    placeholder={`Option ${oi + 1}`}
                    className="flex-1 border-gray-300 rounded px-2 py-1"
                  />
                  <label className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={opt.isCorrect}
                      onChange={(e) =>
                        updateOption(qi, oi, { isCorrect: e.target.checked })
                      }
                    />
                    <span className="text-sm">Correct</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => removeOption(qi, oi)}
                    className="text-red-500 hover:underline text-sm"
                  >
                    x
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addOption(qi)}
                className="text-green-600 hover:underline text-sm"
              >
                + Add Option
              </button>
            </div>
          )}

          {/* True / False */}
          {q.type === "true-false" && (
            <div className="flex items-center space-x-6">
              {q.options.map((opt, oi) => (
                <label key={opt.id} className="flex items-center space-x-1">
                  <input
                    type="radio"
                    name={`tf-${q.id}`}
                    checked={opt.isCorrect}
                    onChange={() =>
                      q.options.forEach((__, idxO) =>
                        updateOption(qi, idxO, {
                          isCorrect: idxO === oi,
                        })
                      )
                    }
                  />
                  <span>{opt.text}</span>
                </label>
              ))}
            </div>
          )}

          {/* Short Answer */}
          {q.type === "short-answer" && (
            <div>
              <label className="block text-gray-700 mb-1">Correct Answer</label>
              <input
                type="text"
                value={q.correctAnswer ?? ""}
                onChange={(e) =>
                  updateQuestion(qi, { correctAnswer: e.target.value })
                }
                className="mt-1 w-full border-gray-300 rounded px-2 py-1"
              />
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
      >
        + Add Question
      </button>
    </div>
  );
}
