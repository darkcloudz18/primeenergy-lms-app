// src/app/courses/[courseId]/ModulesOverview.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import type { ModuleWithLessons } from "@/lib/types";

interface Props {
  courseId: string;
  modules: ModuleWithLessons[];
}

export default function ModulesOverview({ courseId, modules }: Props) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const userId = session?.user?.id;

  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set());

  // on mount (and whenever user changes) load completions
  useEffect(() => {
    if (!userId) {
      setCompletedSet(new Set());
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("user_id", userId);
      if (data) {
        setCompletedSet(new Set(data.map((r) => r.lesson_id)));
      }
    })();
  }, [supabase, userId]);

  return (
    <div className="space-y-6">
      {modules.map((mod) => (
        <div key={mod.id} className="bg-white rounded border p-4 shadow-sm">
          <h3 className="font-semibold mb-2">
            Module {mod.ordering}: {mod.title}
          </h3>
          <ul className="divide-y">
            {mod.lessons.map((lesson) => {
              const done = completedSet.has(lesson.id);
              return (
                <li
                  key={lesson.id}
                  className="flex justify-between py-2 text-sm"
                >
                  <Link
                    href={`/courses/${courseId}/modules/${mod.id}/lessons/${lesson.id}`}
                    className="text-gray-700 hover:underline"
                  >
                    {lesson.ordering}. {lesson.title}
                  </Link>
                  <span
                    className={
                      done ? "text-green-600 font-medium" : "text-gray-400"
                    }
                  >
                    {done ? "Complete" : "Incomplete"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
