// src/app/courses/[courseId]/components/CourseContent.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";
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
  const supabase = useSupabaseClient();
  const session = useSession();

  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set()
  );
  const [passedQuizzes, setPassedQuizzes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const userId = session.user.id;

    // load existing progress
    (async () => {
      setLoading(true);

      const { data: lcRows } = await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("user_id", userId);
      setCompletedLessons(new Set(lcRows?.map((r) => r.lesson_id) || []));

      const { data: qaRows } = await supabase
        .from("quiz_attempts")
        .select("quiz_id")
        .eq("user_id", userId)
        .eq("passed", true);
      setPassedQuizzes(new Set(qaRows?.map((r) => r.quiz_id) || []));

      setLoading(false);
    })();

    // subscribe to new completions
    const channel = supabase
      .channel(`lesson-completions-user-${userId}`, {
        config: { broadcast: { self: true } },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lesson_completions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newId = (payload.new as { lesson_id: string }).lesson_id;
          setCompletedLessons((prev) => {
            const next = new Set(prev);
            next.add(newId);
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, supabase]);

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
        🔒 Enroll in this course to unlock its lessons.
      </div>
    );
  }

  if (loading) {
    return (
      <p className="p-6 text-center text-gray-600">Loading your progress…</p>
    );
  }

  return (
    <section className="space-y-12">
      {modules.map((mod, idx) => {
        const unlocked = isModuleUnlocked(idx);
        return (
          <div
            key={mod.id}
            className={`border rounded-lg shadow-sm ${
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
                        {done ? "Complete" : "Incomplete"}
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
    </section>
  );
}
