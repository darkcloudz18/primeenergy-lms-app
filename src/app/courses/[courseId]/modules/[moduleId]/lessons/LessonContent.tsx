// src/app/courses/[courseId]/modules/[moduleId]/lessons/LessonContent.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";

interface LessonContentProps {
  courseId: string;
  moduleId: string;
  lessonId: string;
  lessonTitle: string;
  lessonContent: string; // this could be HTML or Markdown (you can render accordingly)
}

export default function LessonContent({
  //courseId,
  //moduleId,
  lessonId,
  lessonTitle,
  lessonContent,
}: LessonContentProps) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const user = session?.user;

  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1) On mount, check if this lesson is already completed:
  useEffect(() => {
    async function loadCompletion() {
      setLoading(true);
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("lesson_completions")
        .select("id")
        .match({ lesson_id: lessonId, user_id: user.id })
        .maybeSingle();

      if (!error && data) {
        setIsCompleted(true);
      } else {
        setIsCompleted(false);
      }

      setLoading(false);
    }
    loadCompletion();
  }, [supabase, lessonId, user]);

  // 2) handle “Mark as Complete” click
  async function markComplete() {
    if (!user) {
      alert("Please sign in to mark lessons as complete.");
      return;
    }
    setLoading(true);
    // Double‐check we don’t already have a row:
    const { data: existing, error: e2 } = await supabase
      .from("lesson_completions")
      .select("id")
      .match({ lesson_id: lessonId, user_id: user.id })
      .maybeSingle();

    if (!e2 && existing) {
      // already marked
      setIsCompleted(true);
      setLoading(false);
      return;
    }

    // insert a new row:
    const { data, error } = await supabase
      .from("lesson_completions")
      .insert({ lesson_id: lessonId, user_id: user.id });

    if (!error && data) {
      setIsCompleted(true);
    } else {
      console.error("Error inserting completion:", error);
      alert("Unable to mark as complete.");
    }
    setLoading(false);
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-4">{lessonTitle}</h1>
      <article
        className="prose max-w-none mb-8"
        dangerouslySetInnerHTML={{ __html: lessonContent }}
      />

      <div className="mt-6">
        {loading ? (
          <button
            className="px-4 py-2 bg-gray-300 text-white rounded cursor-not-allowed"
            disabled
          >
            …Loading
          </button>
        ) : isCompleted ? (
          <button
            className="px-4 py-2 bg-green-500 text-white rounded"
            disabled
          >
            ✔︎ Completed
          </button>
        ) : (
          <button
            onClick={markComplete}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Mark as Complete
          </button>
        )}
      </div>
    </div>
  );
}