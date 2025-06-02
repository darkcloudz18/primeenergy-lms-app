// src/app/courses/[courseId]/components/ClientCoursePage.tsx
"use client";

import React from "react";
import CourseHeader from "./CourseHeader";
import CourseContent from "./CourseContent";
import type { ModuleWithLessons } from "@/lib/types";

interface Props {
  courseId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  level?: string;
  tag?: string;
  enrolledCount: number;
  modules: ModuleWithLessons[];
}

export default function ClientCoursePage({
  courseId,
  title,
  description,
  imageUrl,
  category,
  level,
  tag,
  enrolledCount,
  modules,
}: Props) {
  return (
    <div className="space-y-8 max-w-4xl mx-auto p-6">
      <CourseHeader
        courseId={courseId}
        title={title}
        description={description}
        imageUrl={imageUrl}
        category={category}
        level={level}
        tag={tag}
        enrolledCount={enrolledCount}
      />

      <CourseContent courseId={courseId} modules={modules} />
    </div>
  );
}
