import LessonPageClient from "./components/LessonPageClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Lesson } from "@/lib/types";

interface PageProps {
  params: { courseId: string; lessonId: string };
}

export default async function LessonPage({ params }: PageProps) {
  const { courseId, lessonId } = params;

  // 1) course title for the back‐link
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("title")
    .eq("id", courseId)
    .single();
  if (!course) throw new Error("Course not found");

  // 2) all lessons in this course for the sidebar
  const { data: lessonsRaw } = await supabaseAdmin
    .from("lessons")
    .select("id, title")
    .eq("course_id", courseId)
    .order("ordering", { ascending: true });
  const lessons = (lessonsRaw ?? []) as Lesson[];

  // 3) the currently active lesson
  const { data: lesson } = await supabaseAdmin
    .from("lessons")
    .select("id, title, content")
    .eq("id", lessonId)
    .single();
  if (!lesson) throw new Error("Lesson not found");

  return (
    <LessonPageClient
      courseTitle={course.title}
      courseId={courseId}
      lessons={lessons}
      lesson={lesson}
    />
  );
}
