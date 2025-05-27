// src/app/courses/[courseId]/page.tsx
import CourseLessonPage from "@/components/CourseLessonPage";
import { createServerClient } from "@/lib/supabase-server";

interface Props {
  params: { courseId: string };
}

export default async function CoursePage({ params }: Props) {
  const supabase = createServerClient();

  // 1) Fetch the course record
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("*")
    .eq("id", params.courseId)
    .single();

  if (courseError || !course) {
    // you could render a 404 page here
    return <p>Course not found</p>;
  }

  // 2) Fetch its lessons in order
  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", params.courseId)
    .order("ordering", { ascending: true });

  if (lessonsError) {
    return <p>Error loading lessons: {lessonsError.message}</p>;
  }

  // 3) Render your existing CourseLessonPage component
  return (
    <CourseLessonPage
      course={{
        id: course.id,
        title: course.title,
        description: course.description,
        image_url: course.image_url ?? null,
        created_at: course.created_at,
      }}
      initialLessons={lessons.map((l) => ({
        id: l.id,
        course_id: l.course_id,
        title: l.title,
        content: l.content,
        type: l.type,
        ordering: l.ordering,
        created_at: l.created_at,
      }))}
    />
  );
}
 