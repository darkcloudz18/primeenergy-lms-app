// src/app/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/page.tsx
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Sidebar from "../Sidebar";
import LessonContent from "../LessonContent";
import type { Module, Lesson, ModuleWithLessons } from "@/lib/types";

interface PageProps {
  params: {
    courseId: string;
    moduleId: string;
    lessonId: string;
  };
}

// You can force dynamic if you want real-time data each request:
export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: PageProps) {
  const { courseId, moduleId, lessonId } = params;

  // 1) Authenticate & redirect if not signed-in:
  const supabase = createServerComponentClient({ cookies: () => cookies() });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Not signed in—redirect to login
    redirect("/auth/login");
  }

  // 2) Fetch all modules for this course (so we can build the sidebar):
  const { data: modulesRaw, error: modulesError } = await supabaseAdmin
    .from("modules")
    .select("id, title, ordering")
    .eq("course_id", courseId)
    .order("ordering", { ascending: true });

  if (modulesError || !modulesRaw) {
    throw new Error("Failed to load modules: " + modulesError?.message);
  }
  const modules: Module[] = modulesRaw as Module[];
  const moduleIds = modules.map((m) => m.id);

  // 3) Fetch all lessons for those modules, in one query:
  let lessonsByModule: Record<string, Lesson[]> = {};
  if (moduleIds.length > 0) {
    const { data: lessonsRaw, error: lessonsError } = await supabaseAdmin
      .from("lessons")
      .select(
        "id, module_id, title, content, type, ordering, image_url, created_at"
      )
      .in("module_id", moduleIds)
      .order("ordering", { ascending: true });

    if (lessonsError || !lessonsRaw) {
      throw new Error("Failed to load lessons: " + lessonsError?.message);
    }

    // Initialize an object keyed by module id
    lessonsByModule = moduleIds.reduce((acc, mId) => {
      acc[mId] = [];
      return acc;
    }, {} as Record<string, Lesson[]>);

    (lessonsRaw as Lesson[]).forEach((lsn) => {
      if (lessonsByModule[lsn.module_id]) {
        lessonsByModule[lsn.module_id].push(lsn);
      }
    });
  }

  // 4) Build modulesWithLessons array:
  const modulesWithLessons: ModuleWithLessons[] = modules.map((m) => ({
    id: m.id,
    title: m.title,
    ordering: m.ordering,
    lessons: lessonsByModule[m.id] || [],
    // If you have a quiz_id field on modules, you could spread it here:
    // quiz_id: (m as any).quiz_id ?? undefined,
  }));

  // 5) Fetch the **current lesson** by ID:
  const { data: lessonRow, error: lessonError } = await supabaseAdmin
    .from("lessons")
    .select("id, title, content")
    .eq("id", lessonId)
    .single();

  if (lessonError || !lessonRow) {
    throw new Error("Lesson not found: " + lessonError?.message);
  }

  const lesson: Lesson = lessonRow as Lesson;

  // 6) Render the two-pane layout:
  return (
    <div className="flex h-screen">
      {/* Left sidebar */}
      <Sidebar
        courseId={courseId}
        currentModuleId={moduleId}
        currentLessonId={lessonId}
        modules={modulesWithLessons}
      />

      {/* Right pane: lesson content */}
      <LessonContent
        courseId={courseId}
        moduleId={moduleId}
        lessonId={lessonId}
        lessonTitle={lesson.title}
        lessonContent={lesson.content} // this is raw HTML (or markdown)
      />
    </div>
  );
}
