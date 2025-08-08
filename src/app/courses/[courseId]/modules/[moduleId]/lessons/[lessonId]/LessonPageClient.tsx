// src/app/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/LessonPageClient.tsx
"use client";

import React, { useState } from "react";
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
  const [completed, setCompleted] = useState<Set<string>>(
    () => new Set(initialCompleted)
  );
  const [passed] = useState<Set<string>>(() => new Set(initialPassed));
  const router = useRouter();

  // flatten all lessons in order
  const allLessons = modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, module_id: m.id }))
  );
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = allLessons[currentIndex - 1];
  const nextLesson = allLessons[currentIndex + 1];

  // called by LessonContent when Mark Complete succeeds
  const handleComplete = (id: string) => {
    setCompleted((s) => new Set(s).add(id));
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
