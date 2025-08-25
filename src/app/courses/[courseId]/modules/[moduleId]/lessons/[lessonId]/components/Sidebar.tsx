// src/app/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/components/Sidebar.tsx
"use client";

import React, { useMemo, useCallback } from "react";
import Link from "next/link";

// UI-only module type used by the sidebar
export type UIModule = {
  id: string;
  title: string;
  ordering: number;
  lessons: { id: string; title: string; ordering: number }[];
  quiz_id?: string;
};

interface SidebarProps {
  courseId: string;
  currentModuleId: string;
  currentLessonId: string;
  modules: UIModule[];
  finalQuizPath?: string;
  completedLessons: string[];
  passedQuizzes: string[];
  courseTitle?: string;
  finalAttempt?: { score: number; passed: boolean; finishedAt?: string };
}

function formatDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toLocaleDateString();
}

export default function Sidebar({
  courseId,
  currentModuleId,
  currentLessonId,
  modules,
  finalQuizPath,
  completedLessons,
  passedQuizzes,
  courseTitle,
  finalAttempt,
}: SidebarProps) {
  const completedSet = useMemo(
    () => new Set(completedLessons),
    [completedLessons]
  );
  const passedSet = useMemo(() => new Set(passedQuizzes), [passedQuizzes]);

  const isModuleComplete = useCallback(
    (m: UIModule) =>
      m.quiz_id
        ? passedSet.has(m.quiz_id)
        : m.lessons.every((l) => completedSet.has(l.id)),
    [passedSet, completedSet]
  );

  const isModuleUnlocked = useCallback(
    (idx: number) => (idx === 0 ? true : isModuleComplete(modules[idx - 1])),
    [modules, isModuleComplete]
  );

  const allModulesComplete = useMemo(
    () => modules.every((m) => isModuleComplete(m)),
    [modules, isModuleComplete]
  );

  return (
    <aside className="w-64 flex-shrink-0 border-r bg-white h-screen overflow-auto p-4 sticky top-0">
      {courseTitle ? (
        <div className="mb-3">
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wide">
            Course Title
          </div>
          <h2 className="font-bold text-sm truncate">{courseTitle}</h2>
          <div className="mt-2 text-xs font-bold text-gray-700 uppercase tracking-wide">
            Course Content
          </div>
        </div>
      ) : (
        <h2 className="font-bold mb-4">Course Content</h2>
      )}

      {modules.map((mod, idx) => {
        const unlocked = isModuleUnlocked(idx);
        const complete = isModuleComplete(mod);
        const isActiveModule = mod.id === currentModuleId;

        return (
          <div key={mod.id} className="mb-6">
            <div className="flex justify-between items-center bg-gray-50 px-3 py-1 rounded">
              <span className="text-sm font-medium">
                Module {mod.ordering}: {mod.title}
              </span>
              <span
                className={
                  complete
                    ? "text-green-600"
                    : unlocked
                    ? "text-amber-600"
                    : "text-gray-400"
                }
                title={
                  complete
                    ? "Module complete"
                    : unlocked
                    ? "Module unlocked"
                    : "Module locked"
                }
              >
                {complete ? "✅" : unlocked ? "🔓" : "🔒"}
              </span>
            </div>

            <ul
              className={`mt-2 ${
                unlocked ? "" : "opacity-50 pointer-events-none select-none"
              }`}
            >
              {mod.lessons.map((lesson) => {
                const done = completedSet.has(lesson.id);
                const active = isActiveModule && lesson.id === currentLessonId;
                return (
                  <li
                    key={lesson.id}
                    className={`flex justify-between items-center px-3 py-1 rounded hover:bg-gray-100 ${
                      active ? "bg-green-50" : ""
                    }`}
                  >
                    <Link
                      href={`/courses/${courseId}/modules/${mod.id}/lessons/${lesson.id}`}
                      className={`flex-1 text-sm ${
                        active
                          ? "text-green-700 font-semibold"
                          : "text-gray-700"
                      }`}
                    >
                      {lesson.ordering}. {lesson.title}
                    </Link>
                    <span
                      className={`ml-2 text-xs ${
                        done ? "text-green-600" : "text-gray-300"
                      }`}
                      title={done ? "Completed" : "Incomplete"}
                    >
                      {done ? "✔︎" : "○"}
                    </span>
                  </li>
                );
              })}

              {mod.quiz_id && (
                <li className="px-3 py-1 mt-1">
                  <Link
                    href={`/courses/${courseId}/modules/${mod.id}/quiz/${mod.quiz_id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    ▶ Module Quiz
                  </Link>
                </li>
              )}
            </ul>
          </div>
        );
      })}

      {finalQuizPath && (
        <div className="mt-4 pt-4 border-t">
          <Link
            href={allModulesComplete ? finalQuizPath : "#"}
            className={`text-sm hover:underline ${
              allModulesComplete
                ? "text-blue-600"
                : "text-gray-400 pointer-events-none"
            }`}
            aria-disabled={!allModulesComplete}
            title={
              allModulesComplete
                ? "Take the final quiz"
                : "Complete all modules (finish lessons and pass module quizzes) to unlock the final quiz"
            }
          >
            ▶ Final Quiz
          </Link>

          {finalAttempt && (
            <div className="mt-1 text-xs text-gray-500">
              Last attempt: {finalAttempt.score} —{" "}
              {finalAttempt.passed ? "passed" : "not passed"}
              {finalAttempt.finishedAt
                ? ` on ${formatDate(finalAttempt.finishedAt)}`
                : ""}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
