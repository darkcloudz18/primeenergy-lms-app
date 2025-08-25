// src/app/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/LessonPageClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./components/Sidebar";
import LessonContent from "./components/LessonContent";
import type { ModuleWithLessons } from "@/lib/types";

interface Props {
  courseId: string;
  moduleId: string;
  lessonId: string;
  lessonTitle: string;
  lessonContent: string;
  modules: ModuleWithLessons[];
  finalQuizPath?: string;
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
  initialCompleted,
  initialPassed,
}: Props) {
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
  const prevLesson =
    currentIndex > 0 ? allLessons[currentIndex - 1] : undefined;
  const nextLesson =
    currentIndex >= 0 && currentIndex + 1 < allLessons.length
      ? allLessons[currentIndex + 1]
      : undefined;

  // Called by LessonContent when “Mark Complete” succeeds
  const handleComplete = (id: string) => {
    setCompleted((s) => {
      const copy = new Set(s);
      copy.add(id);
      return copy;
    });

    // Auto-advance to next lesson if there is one
    if (nextLesson) {
      router.push(
        `/courses/${courseId}/modules/${nextLesson.module_id}/lessons/${nextLesson.id}`
      );
    }
  };

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
