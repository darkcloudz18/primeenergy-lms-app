// src/app/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/components/LessonPageClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";
import {
  ChevronLeftIcon,
  EyeIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

type Lesson = { id: string; title: string };

interface Props {
  courseTitle: string;
  courseId: string;
  moduleId: string;
  lessons: Lesson[]; // in display order
  lesson: { id: string; title: string; content: string };
}

export default function LessonPageClient({
  courseTitle,
  courseId,
  moduleId,
  lessons,
  lesson,
}: Props) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const user = session?.user;

  const [tab, setTab] = useState<"overview" | "comments">("overview");
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Load completion for all lessons in this module (persisted)
  useEffect(() => {
    if (!user || lessons.length === 0) return;
    (async () => {
      const ids = lessons.map((l) => l.id);
      const { data, error } = await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("user_id", user.id)
        .in("lesson_id", ids);

      if (error) {
        console.error("load completions:", error.message);
        return;
      }
      setCompleted(new Set((data ?? []).map((r) => r.lesson_id)));
    })();
  }, [user, supabase, lessons]);

  // Persisted mark-complete
  const markComplete = async () => {
    if (!user) {
      alert("Please sign in to mark lessons complete.");
      return;
    }
    if (completed.has(lesson.id)) return;

    setSaving(true);
    const { error } = await supabase
      .from("lesson_completions")
      .insert({ lesson_id: lesson.id, user_id: user.id });

    setSaving(false);

    if (error) {
      alert("Could not mark complete: " + error.message);
      return;
    }
    setCompleted((prev) => new Set(prev).add(lesson.id));
  };

  const idx = useMemo(
    () => lessons.findIndex((l) => l.id === lesson.id),
    [lessons, lesson.id]
  );

  const prevHref =
    idx > 0
      ? `/courses/${courseId}/modules/${moduleId}/lessons/${
          lessons[idx - 1].id
        }`
      : null;

  const nextHref =
    idx >= 0 && idx < lessons.length - 1
      ? `/courses/${courseId}/modules/${moduleId}/lessons/${
          lessons[idx + 1].id
        }`
      : null;

  const thisDone = completed.has(lesson.id);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r overflow-y-auto">
        <div className="p-4 border-b">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-600">
            Course Title
          </div>
          <div className="mt-1 font-semibold text-sm truncate">
            {courseTitle}
          </div>

          <Link
            href={`/courses/${courseId}`}
            className="mt-2 inline-flex items-center text-sm text-gray-600 hover:text-green-600"
          >
            <ChevronLeftIcon className="w-4 h-4 mr-1" />
            Back to course
          </Link>
        </div>

        <div className="px-4 pt-3 pb-2 border-b">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-600">
            Course Content
          </div>
        </div>

        <nav className="text-sm">
          {lessons.map((lsn, i) => {
            const active = lsn.id === lesson.id;
            const done = completed.has(lsn.id);
            return (
              <Link
                key={lsn.id}
                href={`/courses/${courseId}/modules/${moduleId}/lessons/${lsn.id}`}
                className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 ${
                  active ? "bg-green-50 border-l-4 border-green-500" : ""
                }`}
              >
                <div className="flex items-center space-x-2">
                  {active && <EyeIcon className="w-4 h-4 text-green-600" />}
                  <span className="truncate">
                    {i + 1}. {lsn.title}
                  </span>
                </div>
                {done && <CheckIcon className="w-4 h-4 text-green-600" />}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="sticky top-0 bg-green-600 text-white flex items-center px-6 h-12 shadow z-10">
          <h2 className="flex-1 text-lg font-semibold">{lesson.title}</h2>
          <button
            onClick={() => setTab("overview")}
            className={`px-3 py-1 rounded-l ${
              tab === "overview"
                ? "bg-green-800"
                : "bg-green-700 hover:bg-green-800"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setTab("comments")}
            className={`px-3 py-1 rounded-r ${
              tab === "comments"
                ? "bg-green-800"
                : "bg-green-700 hover:bg-green-800"
            }`}
          >
            Comments
          </button>
        </header>

        <main className="flex-1 overflow-y-auto bg-white p-6">
          {tab === "overview" ? (
            <article
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: lesson.content }}
            />
          ) : (
            <div className="text-gray-600 italic">No comments yet.</div>
          )}

          {/* Footer actions */}
          <div className="mt-8 flex justify-center gap-3">
            {prevHref && (
              <Link
                href={prevHref}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                ← Previous
              </Link>
            )}

            {thisDone ? (
              <button
                className="px-4 py-2 bg-green-500 text-white rounded"
                disabled
              >
                ✔︎ Completed
              </button>
            ) : (
              <button
                onClick={markComplete}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Mark as Complete"}
              </button>
            )}

            {nextHref ? (
              <Link
                href={thisDone ? nextHref : "#"}
                aria-disabled={!thisDone}
                className={`px-4 py-2 rounded ${
                  thisDone
                    ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                Next →
              </Link>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
