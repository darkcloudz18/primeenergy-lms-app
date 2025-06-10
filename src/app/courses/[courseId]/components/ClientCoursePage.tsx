// src/app/courses/[courseId]/components/ClientCoursePage.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
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
  const supabase = useSupabaseClient();
  const session = useSession();
  const user = session?.user;

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loadingEnroll, setLoadingEnroll] = useState(true);

  // 1️⃣ On mount, check if this user is enrolled
  useEffect(() => {
    if (!user) {
      setIsEnrolled(false);
      setLoadingEnroll(false);
      return;
    }
    setLoadingEnroll(true);
    supabase
      .from("enrollments")
      .select("id", { head: true })
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .then(({ count }) => {
        setIsEnrolled(count !== 0);
        setLoadingEnroll(false);
      });
  }, [supabase, courseId, user]);

  // 2️⃣ Toggle enroll / unenroll
  const onToggleEnroll = async () => {
    if (!user) {
      alert("Please sign in first");
      return;
    }
    setLoadingEnroll(true);
    if (isEnrolled) {
      await supabase
        .from("enrollments")
        .delete()
        .eq("course_id", courseId)
        .eq("user_id", user.id);
      setIsEnrolled(false);
    } else {
      await supabase
        .from("enrollments")
        .insert({ course_id: courseId, user_id: user.id });
      setIsEnrolled(true);
    }
    setLoadingEnroll(false);
  };

  // 3️⃣ Build “Start Learning” URL for the very first lesson:
  const firstLessonPath =
    isEnrolled && modules.length > 0 && modules[0].lessons.length > 0
      ? `/courses/${courseId}/modules/${modules[0].id}/lessons/${modules[0].lessons[0].id}`
      : null;

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
        isEnrolled={isEnrolled}
        loadingEnroll={loadingEnroll}
        onToggleEnroll={onToggleEnroll}
        firstLessonPath={firstLessonPath}
      />

      <CourseContent
        courseId={courseId}
        modules={modules}
        isEnrolled={isEnrolled}
      />
    </div>
  );
}
