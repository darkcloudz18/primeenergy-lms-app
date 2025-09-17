// src/app/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/LessonPageClient.tsx
'use client';

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Sidebar from "./components/Sidebar";
import LessonContent from "./components/LessonContent";
import type { ModuleWithLessons } from "@/lib/types";

async function markCourseCompleted(courseId: string) {
  const supabase = createClientComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Upsert course progress as completed (adjust table/columns if yours differ)
  await supabase
    .from("course_progress")
    .upsert(
      {
        user_id: user.id,
        course_id: courseId,
        status: "completed",
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,course_id" }
    );

  // (Optional) auto-issue certificate here if you want:
  // await supabase.from("certificates").insert({ user_id: user.id, course_id: courseId, issued_at: new Date().toISOString() });
}

interface Props {
  courseId: string;
  moduleId: string;
  lessonId: string;
  lessonTitle: string;
  lessonContent: string;
  modules: ModuleWithLessons[];
  finalQuizPath?: string;      // e.g. `/courses/xyz/final-quiz`
  initialCompleted: string[];  // lesson IDs
  initialPassed: string[];     // quiz IDs (if any)
}

export default function LessonPageClient(props: Props) {
  const {
    courseId,
    moduleId,
    lessonId,
    lessonTitle,
    lessonContent,
    modules,
    finalQuizPath,
    initialCompleted,
    initialPassed,
  } = props;

  const router = useRouter();

  // completed needs to be mutable (we add to it)
  const [completed, setCompleted] = useState<Set<string>>(
    () => new Set(initialCompleted)
  );

  // passed doesn’t change here — compute once from props (no unused setter)
  const passed = useMemo(() => new Set(initialPassed), [initialPassed]);

  // Flatten all lessons in order for next/prev navigation
  const allLessons = useMemo(
    () =>
      modules.flatMap((m) => m.lessons.map((l) => ({ ...l, module_id: m.id }))),
    [modules]
  );

  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : undefined;
  const nextLesson =
    currentIndex >= 0 && currentIndex + 1 < allLessons.length
      ? allLessons[currentIndex + 1]
      : undefined;

  // Called by LessonContent when “Mark Complete” succeeds
  const handleComplete = async (id: string) => {
    // update local state immediately
    setCompleted((s) => {
      const copy = new Set(s);
      copy.add(id);
      return copy;
    });

    // If there is a next lesson, just go there
    if (nextLesson) {
      router.push(
        `/courses/${courseId}/modules/${nextLesson.module_id}/lessons/${nextLesson.id}`
      );
      return;
    }

    // No next lesson -> either go to final quiz (if present) OR finish course
    const hasFinalQuiz = Boolean(finalQuizPath && finalQuizPath.trim().length);
    if (hasFinalQuiz) {
      router.push(finalQuizPath!);
      return;
    }

    // No final quiz: mark course complete, then Congratulation page
    await markCourseCompleted(courseId);
    router.replace(`/courses/${courseId}/congratulations`); // change path if yours differs
  };

  // Fallback: if user reloads on the last lesson and everything is already complete, finish course (when no final quiz)
  useEffect(() => {
    const atEnd = !nextLesson && completed.size >= allLessons.length;
    const noFinalQuiz = !finalQuizPath || !finalQuizPath.trim();
    if (atEnd && noFinalQuiz) {
      (async () => {
        await markCourseCompleted(courseId);
        router.replace(`/courses/${courseId}/congratulations`);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextLesson, completed.size, allLessons.length, finalQuizPath, courseId]);

  return (
    <div className="flex h-screen">
      <Sidebar
        courseId={courseId}
        currentModuleId={moduleId}
        currentLessonId={lessonId}
        modules={modules}
        finalQuizPath={finalQuizPath}
        completedLessons={[...completed]}
        passedQuizzes={[...passed]}
      />

      <LessonContent
        courseId={courseId}
        moduleId={moduleId}
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        lessonContent={lessonContent}
        onComplete={handleComplete}
        prevPath={
          prevLesson
            ? `/courses/${courseId}/modules/${prevLesson.module_id}/lessons/${prevLesson.id}`
            : undefined
        }
        nextPath={
          nextLesson
            ? `/courses/${courseId}/modules/${nextLesson.module_id}/lessons/${nextLesson.id}`
            : undefined
        }
      />
    </div>
  );
}