"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";
import type { ModuleWithLessons } from "@/lib/types";

interface Props {
  courseId: string;
  modules: ModuleWithLessons[];
  isEnrolled: boolean;
  courseTitle?: string;
  finalQuizPath?: string;
}

type LastAttempt = {
  score: number;
  passed: boolean;
  finishedAt?: string | null;
};

export default function CourseContent({
  courseId,
  modules,
  isEnrolled,
  finalQuizPath,
}: Props) {
  const supabase = useSupabaseClient();
  const session = useSession();

  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [lastAttempt, setLastAttempt] = useState<LastAttempt | null>(null);

  const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString() : "";

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const userId = session.user.id;

    (async () => {
      setLoading(true);

      const { data: lcRows } = await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("user_id", userId);
      setCompletedLessons(new Set(lcRows?.map((r) => r.lesson_id) || []));

      const { data: finalQuiz } = await supabase
        .from("quizzes")
        .select("id")
        .eq("course_id", courseId)
        .is("module_id", null)
        .maybeSingle();

      if (finalQuiz?.id) {
        const { data: latest } = await supabase
          .from("quiz_attempts")
          .select("score, passed, finished_at, created_at")
          .eq("user_id", userId)
          .eq("quiz_id", finalQuiz.id)
          .not("finished_at", "is", null)
          .order("finished_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latest) {
          setLastAttempt({
            score: latest.score ?? 0,
            passed: !!latest.passed,
            finishedAt: latest.finished_at ?? latest.created_at ?? null,
          });
        } else {
          setLastAttempt(null);
        }
      } else {
        setLastAttempt(null);
      }

      setLoading(false);
    })();

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
          setCompletedLessons((prev) => new Set(prev).add(newId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, supabase, courseId]);

  function isModuleUnlocked(idx: number) {
    if (!isEnrolled) return false;
    if (idx === 0) return true;
    const prev = modules[idx - 1];
    return prev.lessons.every((l) => completedLessons.has(l.id));
  }

  const allModulesComplete = useMemo(
    () =>
      modules.every((m) => m.lessons.every((l) => completedLessons.has(l.id))),
    [modules, completedLessons]
  );

  if (!isEnrolled) {
    return (
      <div className="p-6 text-center text-gray-600">
        Enroll in this course to unlock its lessons.
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
      {/* {courseTitle ? (
        <div className="mb-2">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Course Title
          </div>
          <div className="text-base font-semibold">{courseTitle}</div>
          <div className="mt-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            Course Content
          </div>
        </div>
      ) : null} */}

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
                Complete the prior module to unlock.
              </div>
            )}
          </div>
        );
      })}

      {finalQuizPath ? (
        <div className="border rounded-lg shadow-sm">
          <header className="bg-gray-100 px-6 py-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">Final Quiz</h3>
            {lastAttempt ? (
              <span className="text-sm text-gray-600">
                Last attempt: {lastAttempt.score}{" "}
                {lastAttempt.passed ? "✓" : "✗"}
                {lastAttempt.finishedAt
                  ? ` on ${fmtDate(lastAttempt.finishedAt)}`
                  : ""}
              </span>
            ) : (
              <span className="text-sm text-gray-400">No attempts yet</span>
            )}
          </header>
          <div className="p-6">
            <Link
              href={finalQuizPath}
              className={`text-blue-600 hover:underline ${
                allModulesComplete ? "" : "opacity-60"
              }`}
              title={
                allModulesComplete
                  ? "Open the Final Quiz"
                  : "Complete all modules to unlock the Final Quiz"
              }
            >
              Go to Final Quiz
            </Link>
            <p className="mt-1 text-sm text-gray-500">
              {allModulesComplete
                ? "Ready when you are."
                : "The final exam unlocks after completing all modules."}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
