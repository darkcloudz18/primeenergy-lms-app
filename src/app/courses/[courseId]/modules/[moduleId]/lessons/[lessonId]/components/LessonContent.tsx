// src/app/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/components/LessonContent.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";

interface Props {
  courseId: string;
  moduleId: string;
  lessonId: string;
  lessonTitle: string;
  lessonContent: string;
  onComplete: (lessonId: string) => void;
  prevPath?: string;
  nextPath?: string;
}

export default function LessonContent({
  lessonId,
  lessonTitle,
  lessonContent,
  onComplete,
  prevPath,
  nextPath,
}: Props) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const user = session?.user;

  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  // initial load of completion
  useEffect(() => {
    (async () => {
      if (!user) return setLoading(false);
      const { data } = await supabase
        .from("lesson_completions")
        .select("id")
        .match({ lesson_id: lessonId, user_id: user.id })
        .maybeSingle();
      setIsCompleted(!!data);
      setLoading(false);
    })();
  }, [lessonId, supabase, user]);

  // handle mark complete
  const markComplete = async () => {
    if (!user) {
      alert("Please sign in to mark lessons complete.");
      return;
    }
    setLoading(true);
    // insert if not exists
    await supabase.from("lesson_completions").insert({
      lesson_id: lessonId,
      user_id: user.id,
    });
    setIsCompleted(true);
    setLoading(false);
    onComplete(lessonId);
  };

  return (
    <div className="flex-1 p-8 overflow-auto">
      <h1 className="text-2xl font-bold mb-4">{lessonTitle}</h1>
      <article
        className="prose max-w-none mb-8"
        dangerouslySetInnerHTML={{ __html: lessonContent }}
      />

      <div className="flex justify-center space-x-4">
        {prevPath && (
          <a
            href={prevPath}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            ← Previous
          </a>
        )}

        {loading ? (
          <button
            className="px-4 py-2 bg-blue-300 text-white rounded cursor-not-allowed"
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

        {nextPath && (
          <a
            href={nextPath}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Next →
          </a>
        )}
      </div>
    </div>
  );
}
