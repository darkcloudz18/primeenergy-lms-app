// src/app/courses/[courseId]/components/ClientCoursePage.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";
import CourseHeader from "./CourseHeader";
import CourseContent from "./CourseContent";
import type { ModuleWithLessons } from "@/lib/types";

interface ClientCoursePageProps {
  courseId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  level?: string;
  tag?: string;
  enrolledCount: number; // from server
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
  enrolledCount: initialCount,
  modules,
}: ClientCoursePageProps) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const user = session?.user ?? null;

  const [enrolled, setEnrolled] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(initialCount);
  const [loadingEnroll, setLoadingEnroll] = useState(false);

  // 1) On mount, check if this user is already enrolled
  useEffect(() => {
    if (!user) {
      setEnrolled(false);
      return;
    }

    supabase
      .from("enrollments")
      .select("id", { head: true })
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .then(({ count, error }) => {
        if (!error && count && count > 0) {
          setEnrolled(true);
        } else {
          setEnrolled(false);
        }
      });
  }, [supabase, user, courseId]);

  // 2) Toggle enroll/unenroll
  async function onToggleEnroll() {
    if (!user) {
      alert("Please sign in first");
      return;
    }
    setLoadingEnroll(true);

    if (enrolled) {
      // Unenroll
      const { error: deleteError } = await supabase
        .from("enrollments")
        .delete()
        .match({ course_id: courseId, user_id: user.id });

      if (!deleteError) {
        setEnrolled(false);
        setEnrolledCount((c) => Math.max(0, c - 1));
      }
    } else {
      // Enroll
      const { error: insertError } = await supabase
        .from("enrollments")
        .insert([{ course_id: courseId, user_id: user.id }]);

      if (!insertError) {
        setEnrolled(true);
        setEnrolledCount((c) => c + 1);
      }
    }

    setLoadingEnroll(false);
  }

  // 3) Compute the “first lesson” path, if it exists
  let firstLessonPath: string | null = null;
  if (modules.length > 0 && modules[0].lessons.length > 0) {
    const firstModuleId = modules[0].id;
    const firstLessonId = modules[0].lessons[0].id;
    firstLessonPath = `/courses/${courseId}/modules/${firstModuleId}/lessons/${firstLessonId}`;
  }

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
        isEnrolled={enrolled}
        onToggleEnroll={onToggleEnroll}
        loadingEnroll={loadingEnroll}
        firstLessonPath={firstLessonPath}
      />

      <CourseContent
        courseId={courseId}
        modules={modules}
        isEnrolled={enrolled}
      />
    </div>
  );
}
