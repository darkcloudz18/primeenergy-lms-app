// src/app/courses/[courseId]/components/ClientCoursePage.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import CourseHeader from "./CourseHeader";
import CourseContent from "./CourseContent";
import type { Lesson } from "@/lib/types";

interface Props {
  courseId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  level?: string;
  tag?: string;
  enrolledCount: number;
  lessons: Lesson[];
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
  lessons,
}: Props) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const user = session?.user;

  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  // initial check
  useEffect(() => {
    if (!user) {
      setEnrolled(false);
      setLoading(false);
      return;
    }
    supabase
      .from("enrollments")
      .select("id")
      .match({ course_id: courseId, user_id: user.id })
      .maybeSingle()
      .then(({ data }) => {
        setEnrolled(!!data);
        setLoading(false);
      });
  }, [supabase, courseId, user]);

  // toggle enroll
  const toggleEnroll = async () => {
    if (!user) {
      alert("Please sign in first");
      return;
    }
    setLoading(true);
    if (enrolled) {
      await supabase
        .from("enrollments")
        .delete()
        .match({ course_id: courseId, user_id: user.id });
      setEnrolled(false);
    } else {
      await supabase
        .from("enrollments")
        .insert({ course_id: courseId, user_id: user.id });
      setEnrolled(true);
    }
    setLoading(false);
  };

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
        enrolled={enrolled}
        loading={loading}
        onToggle={toggleEnroll}
      />
      <CourseContent
        courseId={courseId}
        lessons={lessons}
        enrolled={enrolled}
      />
    </div>
  );
}
