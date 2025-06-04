// src/app/courses/[courseId]/components/CourseContent.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { ModuleWithLessons } from "@/lib/types";

interface CourseContentProps {
  courseId: string;
  modules: ModuleWithLessons[];
  isEnrolled: boolean;
}

export default function CourseContent({
  courseId,
  modules,
  isEnrolled,
}: CourseContentProps) {
  const [completedLessons] = useState<Set<string>>(new Set());
  const [passedQuizzes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      // …fetch `lesson_completions` and `quiz_attempts` as before…
      setLoading(false);
    }
    loadProgress();
  }, []);

  // If not enrolled, show a “please enroll to unlock” banner
  if (!isEnrolled) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 text-center rounded">
        🔒 Enroll in this course to unlock its lessons.
      </div>
    );
  }

  if (loading) {
    return <p className="p-6 text-center text-gray-600">Loading progress…</p>;
  }

  function isModuleUnlocked(idx: number, modulesList: ModuleWithLessons[]) {
    if (idx === 0) return true;
    const prevModule = modulesList[idx - 1];
    const prevQuizId = prevModule.quiz_id;
    if (prevQuizId && passedQuizzes.has(prevQuizId)) return true;

    const allPrevDone = prevModule.lessons.every((lesson) =>
      completedLessons.has(lesson.id)
    );
    return allPrevDone;
  }

  return (
    <section className="space-y-12">
      {modules.map((module, idx) => {
        const unlocked = isModuleUnlocked(idx, modules);

        return (
          <div
            key={module.id}
            className={`border rounded-lg overflow-hidden shadow-sm ${
              unlocked ? "" : "opacity-50"
            }`}
          >
            <header className="bg-gray-100 px-6 py-4">
              <h3 className="text-xl font-semibold">
                Module {module.ordering}: {module.title}
              </h3>
            </header>

            {unlocked ? (
              <ul className="divide-y">
                {module.lessons.map((lesson) => {
                  const done = completedLessons.has(lesson.id);
                  return (
                    <li
                      key={lesson.id}
                      className="px-6 py-4 flex justify-between items-center"
                    >
                      <Link
                        href={`/courses/${courseId}/modules/${module.id}/lessons/${lesson.id}`}
                        className="flex-1 hover:text-green-600 transition-colors"
                      >
                        {lesson.ordering}. {lesson.title}
                      </Link>
                      <span
                        className={`text-sm font-medium ${
                          done ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {done ? "Done" : "Not Done"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-6 text-center text-gray-500">
                🔒 This module is locked. Complete previous module’s lessons or
                quiz first.
              </div>
            )}
          </div>
        );
      })}

      {/* Final Quiz button */}
      <div className="mt-8 text-center">
        <Link
          href={`/courses/${courseId}/final-quiz`}
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
        >
          Take Final Quiz
        </Link>
      </div>
    </section>
  );
}
