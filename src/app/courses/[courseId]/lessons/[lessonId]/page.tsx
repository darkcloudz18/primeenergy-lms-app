// src/app/courses/[courseId]/lessons/[lessonId]/page.tsx
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import LessonPageClient from "./components/LessonPageClient";

type PageProps = {
  params: { courseId: string; lessonId: string };
};

export default async function LessonPage({ params }: PageProps) {
  const { courseId, lessonId } = params;

  // 1) Course (for title)
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .single();

  // 2) Lesson with its module_id
  const { data: lessonRow, error: lessonErr } = await supabaseAdmin
    .from("lessons")
    .select("id, title, content, module_id")
    .eq("id", lessonId)
    .single();

  if (lessonErr || !lessonRow) {
    return <div className="p-6 text-red-600">Lesson not found.</div>;
  }

  // 3) Ensure lesson belongs to this course via its module
  const { data: mod } = await supabaseAdmin
    .from("modules")
    .select("id, course_id")
    .eq("id", lessonRow.module_id)
    .single();

  if (!mod || mod.course_id !== courseId) {
    return (
      <div className="p-6 text-red-600">
        This lesson does not belong to this course.
      </div>
    );
  }

  // 4) Sibling lessons for sidebar/nav
  const { data: siblings } = await supabaseAdmin
    .from("lessons")
    .select("id, title, ordering")
    .eq("module_id", lessonRow.module_id)
    .order("ordering", { ascending: true });

  return (
    <LessonPageClient
      courseTitle={course?.title ?? ""}
      courseId={courseId}
      moduleId={lessonRow.module_id}
      lessons={(siblings ?? []).map((l) => ({
        id: l.id,
        title: l.title,
        ordering: l.ordering,
      }))}
      lesson={{
        id: lessonRow.id,
        title: lessonRow.title,
        content: lessonRow.content as unknown as string,
      }}
    />
  );
}
