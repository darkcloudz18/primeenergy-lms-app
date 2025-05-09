// src/app/demo/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircle as faCircleEmpty,
  faCheckCircle as faCircleSolid,
} from "@fortawesome/free-regular-svg-icons";

interface DemoLesson {
  id: string;
  title: string;
  content: string;
}

const demoLessons: DemoLesson[] = [
  {
    id: "l1",
    title: "Understanding Radiated Emissions in PV Systems",
    content: `
**What are radiated emissions?**  
Radiated emissions are electromagnetic energy unintentionally emitted by photovoltaic (PV) system components. They can interfere with radios, cellular signals, and other equipment.
`,
  },
  {
    id: "l2",
    title: "Best Practices for Reducing Radiated Emissions",
    content: `
1. **Shorter Cable Lengths**
    Minimize both DC and AC cable runs.  
2. **Cable Routing**  
   Separate communication/control wiring from power conductors.  
3. **Shielding**  
   Use shielded cables and grounded enclosures.
`,
  },
  {
    id: "l3",
    title: "Case Studies in EMI Mitigation",
    content: `
- **Residential System near Airport**  
  Added ferrite beads and extra grounding rods to meet compliance.  
- **Industrial Facility with Precision Equipment**  
  Switched to microinverters and low-noise filters, reducing emissions by 60%.
`,
  },
];

export default function DemoCoursePage() {
  const [currentLesson, setCurrentLesson] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<
    Record<string, boolean>
  >({});

  const lesson = demoLessons[currentLesson];
  const markComplete = () => {
    setCompletedLessons((prev) => ({ ...prev, [lesson.id]: true }));
  };

  // true once every demoLessons[i].id is in completedLessons
  const allDone = demoLessons.every((l) => completedLessons[l.id]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ─── SIDEBAR ─── */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4 text-green-600">Lessons</h2>
        <ul className="space-y-3">
          {demoLessons.map((l, idx) => {
            const done = !!completedLessons[l.id];
            return (
              <li key={l.id}>
                <button
                  onClick={() => setCurrentLesson(idx)}
                  className="flex items-center gap-2 w-full text-left hover:bg-gray-100 px-2 py-1 rounded"
                >
                  <FontAwesomeIcon
                    icon={done ? faCircleSolid : faCircleEmpty}
                    className={done ? "text-green-500" : "text-gray-300"}
                  />
                  <span
                    className={`truncate ${
                      idx === currentLesson
                        ? "font-medium text-green-600"
                        : "text-gray-700"
                    }`}
                  >
                    {l.title}
                  </span>
                </button>
              </li>
            );
          })}

          {/* ─── QUIZ LINE ─── */}
          <li className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={allDone ? faCircleSolid : faCircleEmpty}
                className={allDone ? "text-green-500" : "text-gray-300"}
              />
              <span
                className={`${
                  allDone ? "text-green-600 font-semibold" : "text-gray-400"
                }`}
              >
                Quiz
              </span>
            </div>
          </li>
        </ul>
      </aside>

      {/* ─── MAIN PANEL ─── */}
      <main className="flex-1 p-8">
        {!allDone ? (
          <>
            <h1 className="text-2xl font-bold mb-4 text-green-600">
              {lesson.title}
            </h1>
            <article className="prose prose-green mb-8 text-black">
              <ReactMarkdown>{lesson.content}</ReactMarkdown>
            </article>

            <div className="flex items-center gap-4">
              {/* Previous */}
              {currentLesson > 0 && (
                <button
                  onClick={() => setCurrentLesson((i) => i - 1)}
                  className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
                >
                  ← Previous
                </button>
              )}

              {/* Mark Complete */}
              {!completedLessons[lesson.id] ? (
                <button
                  onClick={markComplete}
                  className="ml-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Mark Complete
                </button>
              ) : (
                <span className="ml-auto inline-flex items-center gap-1 bg-green-100 text-green-600 rounded px-3 py-1">
                  <FontAwesomeIcon icon={faCircleSolid} />
                  Completed
                </span>
              )}

              {/* Next */}
              {currentLesson < demoLessons.length - 1 && (
                <button
                  onClick={() => setCurrentLesson((i) => i + 1)}
                  className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
                >
                  Next →
                </button>
              )}
            </div>
          </>
        ) : (
          /* ─── ALL DONE → QUIZ PROMPT ─── */
          <div className="text-center mt-16 space-y-6">
            <h1 className="text-3xl font-bold text-green-600">
              All Lessons Complete!
            </h1>
            <p className="text-gray-700">
              You’re ready to test your knowledge with the course quiz.
            </p>
            <Link href="/demo/quiz">
              <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Take Quiz →
              </button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
