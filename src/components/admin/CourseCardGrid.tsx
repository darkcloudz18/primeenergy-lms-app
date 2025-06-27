// src/components/admin/CourseCardGrid.tsx
"use client";

import React from "react";
import type { Course } from "@/lib/types";
import CourseCard from "./CourseCard";

export default function CourseCardGrid({ courses }: { courses: Course[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((c) => (
        <CourseCard key={c.id} course={c} />
      ))}
    </div>
  );
}
