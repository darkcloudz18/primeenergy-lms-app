// src/app/courses/[courseId]/components/CourseContent.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { ModuleWithLessons } from "@/lib/types";

interface CourseContentProps {
  courseId: string;
  modules: ModuleWithLessons[];
}

export default function CourseContent({
  courseId,
  modules,
}: CourseContentProps) {
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set()
  );
  const [passedQuizzes, setPassedQuizzes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // 1) On mount, fetch lesson completions & quiz attempts for this user
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

      // a) Fetch all completed lessons for this user (in any course)
      const { data: lcRows, error: lcError } = await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("user_id", user.id);

      if (!lcError && lcRows) {
        setCompletedLessons(new Set(lcRows.map((r) => r.lesson_id)));
      }

      // b) Fetch all quiz_attempts where passed = true (to know which quizzes they passed)
      const { data: qaRows, error: qaError } = await supabase
        .from("quiz_attempts")
        .select("quiz_id")
        .eq("user_id", user.id)
        .eq("passed", true);

      if (!qaError && qaRows) {
        setPassedQuizzes(new Set(qaRows.map((r) => r.quiz_id)));
      }

      setLoading(false);
    }

    loadProgress();
  }, []);

  // Helper: determine if module N is unlocked
  function isModuleUnlocked(
    currentModuleIndex: number,
    modulesList: ModuleWithLessons[]
  ) {
    // The very first module is always unlocked:
    if (currentModuleIndex === 0) return true;

    // Otherwise, look at the previous module (index - 1)
    const prevModule = modulesList[currentModuleIndex - 1];

    // a) If they passed the previous module’s quiz:
    //    Assume ModuleWithLessons has an optional `quiz_id` field on each module.
    const prevQuizId = (prevModule as { quiz_id?: string }).quiz_id;
    if (prevQuizId && passedQuizzes.has(prevQuizId)) return true;

    // b) Or if they completed every lesson in the previous module:
    const allPrevLessonsDone = prevModule.lessons.every((lesson) =>
      completedLessons.has(lesson.id)
    );
    if (allPrevLessonsDone) return true;

    return false;
  }

  if (loading) {
    return <p className="p-6 text-center text-gray-600">Loading progress…</p>;
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

            {/* If unlocked, show the lesson links; otherwise show “Locked” message */}
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

      {/* ── Final Quiz Button (optionally only if all modules are done) ── */}
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
