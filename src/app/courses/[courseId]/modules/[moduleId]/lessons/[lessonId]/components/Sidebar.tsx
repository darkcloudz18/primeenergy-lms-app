// src/app/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/components/Sidebar.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";
import type { ModuleWithLessons } from "@/lib/types";

interface SidebarProps {
  courseId: string;
  currentModuleId: string;
  currentLessonId: string;
  modules: ModuleWithLessons[];
  finalQuizPath?: string;
  completedLessons: string[];
  passedQuizzes: string[];
}

export default function Sidebar({
  courseId,
  currentModuleId,
  currentLessonId,
  modules,
  finalQuizPath,
  completedLessons,
  passedQuizzes,
}: SidebarProps) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const user = session?.user;

  const [lc, setLc] = useState(new Set(completedLessons));
  const [pq, setPq] = useState(new Set(passedQuizzes));

  // If you still want real‐time fetch you can re‐run here…
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: lcRows } = await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("user_id", user.id);
      setLc(new Set(lcRows?.map((r) => r.lesson_id) || []));

      const { data: qaRows } = await supabase
        .from("quiz_attempts")
        .select("quiz_id")
        .eq("user_id", user.id)
        .eq("passed", true);
      setPq(new Set(qaRows?.map((r) => r.quiz_id) || []));
    })();
  }, [supabase, user]);

  const isModuleUnlocked = (idx: number) => {
    if (idx === 0) return true;
    const prev = modules[idx - 1];
    if (prev.quiz_id && pq.has(prev.quiz_id)) return true;
    return prev.lessons.every((l) => lc.has(l.id));
  };

  return (
    <aside className="w-64 flex-shrink-0 border-r bg-white h-screen overflow-auto p-4 sticky top-0">
      <h2 className="font-semibold mb-4">Course Content</h2>
      {modules.map((mod, idx) => {
        const unlocked = isModuleUnlocked(idx);
        const isActiveModule = mod.id === currentModuleId;

        return (
          <div key={mod.id} className="mb-6">
            <div className="flex justify-between items-center bg-gray-50 px-3 py-1 rounded">
              <span className="text-sm font-medium">
                Module {mod.ordering}: {mod.title}
              </span>
              <span className={unlocked ? "text-green-600" : "text-gray-400"}>
                {unlocked ? "🔓" : "🔒"}
              </span>
            </div>
            <ul
              className={`mt-2 ${
                !unlocked ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {mod.lessons.map((lesson) => {
                const done = lc.has(lesson.id);
                const isActiveLesson =
                  isActiveModule && lesson.id === currentLessonId;
                return (
                  <li
                    key={lesson.id}
                    className={`flex justify-between items-center px-3 py-1 rounded hover:bg-gray-100 ${
                      isActiveLesson ? "bg-green-50" : ""
                    }`}
                  >
                    <Link
                      href={`/courses/${courseId}/modules/${mod.id}/lessons/${lesson.id}`}
                      className={`flex-1 text-sm ${
                        isActiveLesson
                          ? "text-green-700 font-semibold"
                          : "text-gray-700"
                      }`}
                    >
                      {lesson.ordering}. {lesson.title}
                    </Link>
                    <span
                      className={`ml-2 text-sm ${
                        done ? "text-green-500" : "text-gray-300"
                      }`}
                    >
                      {done ? "✔︎" : "○"}
                    </span>
                  </li>
                );
              })}

              {mod.quiz_id && (
                <li className="px-3 py-1 mt-1">
                  <Link
                    href={`/courses/${courseId}/modules/${mod.id}/quiz`}
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
            href={finalQuizPath}
            className="text-sm text-blue-600 hover:underline"
          >
            ▶ Final Quiz
          </Link>
        </div>
      )}
    </aside>
  );
}
