"use client";

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
  const { error } = await supabase
    .from("course_progress")
    .upsert(
      { user_id: user.id, course_id: courseId, status: "completed", completed_at: new Date().toISOString() },
      { onConflict: "user_id,course_id" }
    );
  if (error) console.error("course_progress upsert failed:", error);
}

interface Props {
  courseId: string;
  moduleId: string;
  lessonId: string;
  lessonTitle: string;
  lessonContent: string;
  modules: ModuleWithLessons[];
  finalQuizPath?: string;
  finalQuizPassed?: boolean;     // 👈 NEW
  initialCompleted: string[];
  initialPassed: string[];
}

export default function LessonPageClient({
  courseId,
  moduleId,
  lessonId,
  lessonTitle,
  lessonContent,
  modules,
  finalQuizPath,
  finalQuizPassed = false,        // 👈 default
  initialCompleted,
  initialPassed,
}: Props) {
  const router = useRouter();

  const [completed, setCompleted] = useState<Set<string>>(
    () => new Set(initialCompleted)
  );
  const passed = useMemo(() => new Set(initialPassed), [initialPassed]);

  // ordered lessons for prev/next
  const allLessons = useMemo(
    () => modules.flatMap((m) => m.lessons.map((l) => ({ ...l, module_id: m.id }))),
    [modules]
  );
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : undefined;
  const nextLesson =
    currentIndex >= 0 && currentIndex + 1 < allLessons.length
      ? allLessons[currentIndex + 1]
      : undefined;

  // ✅ compute when to show Congrats link
  const allLessonsDone = completed.size >= allLessons.length;
  const showCongratsLink = allLessonsDone && (!finalQuizPath || finalQuizPassed);
  const congratulationsPath = showCongratsLink
    ? `/courses/${courseId}/congratulations`
    : undefined;

  // Called when “Mark Complete” succeeds for the current lesson
  const handleComplete = async (id: string) => {
    setCompleted((s) => new Set(s).add(id));

    if (nextLesson) {
      router.push(`/courses/${courseId}/modules/${nextLesson.module_id}/lessons/${nextLesson.id}`);
      return;
    }

    // last lesson
    const hasFinalQuiz = Boolean(finalQuizPath && finalQuizPath.trim());
    if (hasFinalQuiz) {
      router.push(finalQuizPath!);
      return;
    }

    await markCourseCompleted(courseId);
    router.replace(`/courses/${courseId}/congratulations`);
  };

  // Safety: if user reloads on the end and there is no final quiz, complete course
  useEffect(() => {
    const atEnd = !nextLesson && allLessonsDone && (!finalQuizPath || !finalQuizPath.trim());
    if (atEnd) {
      (async () => {
        await markCourseCompleted(courseId);
        router.replace(`/courses/${courseId}/congratulations`);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    //es
  }, [nextLesson, allLessonsDone, finalQuizPath, courseId]);

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
        congratulationsPath={congratulationsPath}  
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