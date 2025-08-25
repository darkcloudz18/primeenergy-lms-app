// src/app/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/components/LearningShell.tsx
"use client";

import React from "react";
import Sidebar, { UIModule } from "./Sidebar";
import type { Lesson, ModuleWithLessons } from "@/lib/types";

type ModuleInput = UIModule | ModuleWithLessons;

type Props = {
  courseId: string;
  currentModuleId: string;
  currentLessonId: string;
  modules: ModuleInput[];
  finalQuizPath?: string;
  completedLessons: string[];
  passedQuizzes: string[];
  children: React.ReactNode;

  // Note: may come in as null from upstream
  courseTitle?: string;
  finalAttempt?: { score: number; passed: boolean; finishedAt?: string | null };
};

// ---- type guards / normalization to UIModule ----
type ModuleCommon = { id: string; title: string; ordering: number };

function isFullLesson(obj: unknown): obj is Lesson {
  if (typeof obj !== "object" || obj === null) return false;
  const rec = obj as Record<string, unknown>;
  return (
    "id" in rec && "title" in rec && "ordering" in rec && "module_id" in rec
  );
}

function isFullModule(m: ModuleInput): m is ModuleWithLessons {
  const lessons = (m as { lessons?: unknown }).lessons;
  return (
    Array.isArray(lessons) && lessons.length > 0 && isFullLesson(lessons[0])
  );
}

function toUIModule(m: ModuleInput): UIModule {
  const base = m as unknown as ModuleCommon;
  const lessons = isFullModule(m)
    ? m.lessons.map((l) => ({ id: l.id, title: l.title, ordering: l.ordering }))
    : (m as UIModule).lessons;
  const quiz_id = (m as Partial<UIModule>).quiz_id;
  return {
    id: base.id,
    title: base.title,
    ordering: base.ordering,
    lessons,
    ...(quiz_id ? { quiz_id } : {}),
  };
}

export default function LearningShell({
  children,
  modules,
  finalAttempt,
  ...sidebarProps
}: Props) {
  const uiModules = modules.map(toUIModule);

  // ✅ Normalize null -> undefined so it matches SidebarProps
  const normalizedAttempt = finalAttempt
    ? { ...finalAttempt, finishedAt: finalAttempt.finishedAt ?? undefined }
    : undefined;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        {...sidebarProps}
        modules={uiModules}
        finalAttempt={normalizedAttempt}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
