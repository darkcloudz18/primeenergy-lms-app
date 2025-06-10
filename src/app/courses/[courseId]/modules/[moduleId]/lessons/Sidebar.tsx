// src/app/courses/[courseId]/modules/[moduleId]/lessons/Sidebar.tsx
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
}

export default function Sidebar({
  courseId,
  currentModuleId,
  currentLessonId,
  modules,
}: SidebarProps) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const user = session?.user;

  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set()
  );
  const [passedQuizzes, setPassedQuizzes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: lcRows } = await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("user_id", user.id);
      if (lcRows) setCompletedLessons(new Set(lcRows.map((r) => r.lesson_id)));

      const { data: qaRows } = await supabase
        .from("quiz_attempts")
        .select("quiz_id")
        .eq("user_id", user.id)
        .eq("passed", true);
      if (qaRows) setPassedQuizzes(new Set(qaRows.map((r) => r.quiz_id)));
    })();
  }, [supabase, user]);

  const isModuleUnlocked = (idx: number) => {
    if (idx === 0) return true;
    const prev = modules[idx - 1];
    if (prev.quiz_id && passedQuizzes.has(prev.quiz_id)) return true;
    return prev.lessons.every((l) => completedLessons.has(l.id));
  };

  return (
    <aside className="w-64 border-r bg-white h-screen overflow-auto">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Course Content</h2>
      </div>

      {modules.map((mod, idx) => {
        const unlocked = isModuleUnlocked(idx);
        const isActiveModule = mod.id === currentModuleId;

        return (
          <div key={mod.id} className="divide-y">
            <div className="px-4 py-2 flex justify-between bg-gray-50">
              <span className="text-sm font-medium">
                Module {mod.ordering}: {mod.title}
              </span>
              <span
                className={`text-xs ${
                  unlocked ? "text-green-600" : "text-gray-400"
                }`}
              >
                {unlocked ? "🔓" : "🔒"}
              </span>
            </div>

            {/* lessons list */}
            <ul className={!unlocked ? "opacity-50 pointer-events-none" : ""}>
              {mod.lessons.map((lesson) => {
                const done = completedLessons.has(lesson.id);
                const isActiveLesson =
                  isActiveModule && lesson.id === currentLessonId;
                return (
                  <li
                    key={lesson.id}
                    className={`px-4 py-2 flex justify-between items-center hover:bg-gray-100 ${
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

              {/* only show “Module Quiz” if this module has at least one lesson */}
              {mod.lessons.length > 0 && (
                <li className="px-4 py-2">
                  <Link
                    href={`/courses/${courseId}/modules/${mod.id}/lessons/${mod.lessons[0].id}`}
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

      {/* only show Final Quiz if there is at least one module with lessons */}
      {modules.length > 0 && modules.some((m) => m.lessons.length > 0) && (
        <div className="px-4 py-3 border-t">
          <Link
            href={`/courses/${courseId}/modules/${
              modules[modules.length - 1].id
            }/lessons/${modules[modules.length - 1].lessons[0].id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ▶ Final Quiz
          </Link>
        </div>
      )}
    </aside>
  );
}
