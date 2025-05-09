// src/app/demo/quiz/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

type QuestionType =
  | { type: "true_false"; question: string; correct: boolean }
  | {
      type: "single_choice";
      question: string;
      options: string[];
      correctIndex: number;
    }
  | {
      type: "multiple_choice";
      question: string;
      options: string[];
      correctIndexes: number[];
    };

// The shape of answers: either a boolean, a single-index, or an array of indexes
type Answer = boolean | number | number[] | null;

const questions: QuestionType[] = [
  {
    type: "true_false",
    question:
      "Ferrite beads are used to suppress high-frequency noise in cables.",
    correct: true,
  },
  {
    type: "single_choice",
    question: "Which standard covers radiated immunity testing?",
    options: ["CISPR 11", "IEC 61000-4-3", "FCC Part 15", "EN 55022"],
    correctIndex: 1,
  },
  {
    type: "multiple_choice",
    question: "Select all that help reduce radiated emissions:",
    options: [
      "Shorter cable runs",
      "Twisted-pair cables",
      "Unshielded wiring",
      "Grounded enclosures",
    ],
    correctIndexes: [0, 1, 3],
  },
  {
    type: "single_choice",
    question: "Which component often emits unintended electromagnetic energy?",
    options: ["PV modules", "Inverters", "Racking", "Cables only"],
    correctIndex: 1,
  },
  {
    type: "true_false",
    question:
      "Separating DC and AC cables can help cancel out electromagnetic fields.",
    correct: true,
  },
];

export default function DemoQuizPage() {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState<Answer>(null);
  const [finished, setFinished] = useState(false);

  const q = questions[index];
  const isLast = index === questions.length - 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let correct = false;
    if (q.type === "true_false") {
      correct = answer === q.correct;
    } else if (q.type === "single_choice") {
      correct = answer === q.correctIndex;
    } else {
      // multiple_choice
      const picked = Array.isArray(answer) ? [...answer].sort() : [];
      correct =
        JSON.stringify(picked) ===
        JSON.stringify(q.correctIndexes.slice().sort());
    }

    if (correct) {
      setScore((s) => s + 1);
    }

    if (isLast) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setAnswer(null);
    }
  };

  const resetQuiz = () => {
    setIndex(0);
    setScore(0);
    setAnswer(null);
    setFinished(false);
  };

  const percent = Math.round((score / questions.length) * 100);
  const passed = percent >= 80;

  if (finished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <h1 className="text-3xl font-bold mb-4 text-green-600">
          You scored {score} / {questions.length} ({percent}%)
        </h1>
        {passed ? (
          <Link href="/demo/certificate">
            <button className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700">
              View Certificate →
            </button>
          </Link>
        ) : (
          <button
            onClick={resetQuiz}
            className="px-6 py-3 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Retake Quiz
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-6">
      <div className="bg-white shadow rounded-lg w-full max-w-2xl p-6">
        <h2 className="text-xl font-semibold mb-2 text-green-600">
          Question {index + 1} of {questions.length}
        </h2>
        <p className="mb-4 text-black">{q.question}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {q.type === "true_false" && (
            <div className="space-x-4">
              <label className="inline-flex items-center text-black">
                <input
                  type="radio"
                  name="answer"
                  checked={answer === true}
                  onChange={() => setAnswer(true)}
                  className="mr-2 text-black"
                />
                True
              </label>
              <label className="inline-flex items-center text-black">
                <input
                  type="radio"
                  name="answer"
                  checked={answer === false}
                  onChange={() => setAnswer(false)}
                  className="mr-2"
                />
                False
              </label>
            </div>
          )}

          {q.type === "single_choice" &&
            q.options.map((opt, i) => (
              <label key={i} className="flex items-center space-x-2 text-black">
                <input
                  type="radio"
                  name="answer"
                  checked={answer === i}
                  onChange={() => setAnswer(i)}
                  className="mr-2"
                />
                <span>{opt}</span>
              </label>
            ))}

          {q.type === "multiple_choice" &&
            q.options.map((opt, i) => {
              const sel = Array.isArray(answer) ? answer : [];
              return (
                <label
                  key={i}
                  className="flex items-center space-x-2 text-black"
                >
                  <input
                    type="checkbox"
                    checked={sel.includes(i)}
                    onChange={() => {
                      const next = sel.includes(i)
                        ? sel.filter((x) => x !== i)
                        : [...sel, i];
                      setAnswer(next);
                    }}
                    className="mr-2 text-black"
                  />
                  <span className="text-black">{opt}</span>
                </label>
              );
            })}

          <button
            type="submit"
            disabled={
              answer === null || (Array.isArray(answer) && answer.length === 0)
            }
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {isLast ? "Finish Quiz" : "Next Question →"}
          </button>
        </form>
      </div>
    </div>
  );
}
