// src/app/courses/[courseId]/components/CourseContent.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { ModuleWithLessons } from "@/lib/types";

interface Props {
  courseId: string;
  modules: ModuleWithLessons[];
  isEnrolled: boolean;
}

export default function CourseContent({
  courseId,
  modules,
  isEnrolled,
}: Props) {
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set()
  );
  const [passedQuizzes, setPassedQuizzes] = useState<Set<string>>(new Set());
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

      const { data: lc } = await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("user_id", user.id);

      setCompletedLessons(new Set(lc?.map((r) => r.lesson_id) || []));

      const { data: qa } = await supabase
        .from("quiz_attempts")
        .select("quiz_id")
        .eq("user_id", user.id)
        .eq("passed", true);

      setPassedQuizzes(new Set(qa?.map((r) => r.quiz_id) || []));
      setLoading(false);
    }
    loadProgress();
  }, []);

  function isModuleUnlocked(idx: number) {
    if (!isEnrolled) return false;
    if (idx === 0) return true;

    const prev = modules[idx - 1];
    if (prev.quiz_id && passedQuizzes.has(prev.quiz_id)) return true;
    if (prev.lessons.every((l) => completedLessons.has(l.id))) return true;
    return false;
  }

  if (!isEnrolled) {
    return (
      <div className="p-6 text-center text-gray-600">
        <span className="inline-flex items-center">
          🔒 Enroll in this course to unlock its lessons.
        </span>
      </div>
    );
  }

  if (loading) {
    return <p className="p-6 text-center text-gray-600">Loading progress…</p>;
  }

  return (
    <section className="space-y-12">
      {modules.map((mod, idx) => {
        const unlocked = isModuleUnlocked(idx);
        return (
          <div
            key={mod.id}
            className={`border rounded-lg overflow-hidden shadow-sm ${
              unlocked ? "" : "opacity-50"
            }`}
          >
            <header className="bg-gray-100 px-6 py-4">
              <h3 className="text-xl font-semibold">
                Module {mod.ordering}: {mod.title}
              </h3>
            </header>

            {unlocked ? (
              <ul className="divide-y">
                {mod.lessons.map((lesson) => {
                  const done = completedLessons.has(lesson.id);
                  return (
                    <li
                      key={lesson.id}
                      className="px-6 py-4 flex justify-between items-center"
                    >
                      <Link
                        href={`/courses/${courseId}/modules/${mod.id}/lessons/${lesson.id}`}
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
                🔒 Complete prior module to unlock.
              </div>
            )}
          </div>
        );
      })}

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
