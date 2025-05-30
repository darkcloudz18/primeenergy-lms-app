// src/app/courses/[courseId]/components/CourseContent.tsx
"use client";

import Link from "next/link";
import { EyeIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import type { Lesson } from "@/lib/types";

interface CourseContentProps {
  courseId: string;
  lessons: Lesson[];
  enrolled: boolean;
}

export default function CourseContent({
  courseId,
  lessons,
  enrolled,
}: CourseContentProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Course Content</h2>
      <div className="bg-white border rounded shadow divide-y">
        {lessons.map((lesson, i) => (
          <div
            key={lesson.id}
            className="flex justify-between items-center px-4 py-3 hover:bg-gray-50"
          >
            <span>
              {i + 1}. {lesson.title}
            </span>
            {enrolled ? (
              <Link
                href={`/courses/${courseId}/lessons/${lesson.id}`}
                className="text-green-600 hover:underline"
              >
                <EyeIcon className="w-5 h-5" />
              </Link>
            ) : (
              <LockClosedIcon className="w-5 h-5 text-gray-400" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
