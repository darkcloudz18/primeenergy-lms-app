// src/app/dashboard/tutor/courses/edit/[courseId]/modules/[moduleId]/lessons/[lessonId]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "default-no-store";

import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Matches exactly what we SELECT
type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  ordering: number | null;
  content: string | null;
  type: "article" | "video" | "image" | null;
  image_url: string | null;
};

interface PageProps {
  params: { courseId: string; moduleId: string; lessonId: string };
}

export default async function TutorLessonEditPage({ params }: PageProps) {
  const { courseId, moduleId, lessonId } = params;

  // Guard: module must belong to course
  const { data: mod, error: modErr } = await supabaseAdmin
    .from("modules")
    .select("id, course_id, title, ordering")
    .eq("id", moduleId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (modErr || !mod) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <p className="text-red-600">Module not found for this course.</p>
      </main>
    );
  }

  // Load lesson
  const { data: lesData, error: lesErr } = await supabaseAdmin
    .from("lessons")
    .select("id, module_id, title, ordering, content, type, image_url")
    .eq("id", lessonId)
    .eq("module_id", moduleId)
    .maybeSingle();

  if (lesErr || !lesData) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <p className="text-red-600">Lesson not found.</p>
        <pre className="mt-4 bg-gray-100 p-3 rounded text-xs">
          {JSON.stringify(
            { courseId, moduleId, lessonId, modErr, lesErr },
            null,
            2
          )}
        </pre>
      </main>
    );
  }

  const lesson: LessonRow = {
    id: lesData.id,
    module_id: lesData.module_id,
    title: lesData.title ?? "",
    ordering: lesData.ordering ?? 1,
    content: lesData.content ?? "",
    type: (lesData.type as LessonRow["type"]) ?? "article",
    image_url: lesData.image_url ?? "",
  };

  const back = `/dashboard/tutor/courses/edit/${courseId}`;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Lesson – {lesson.title}</h1>
        <Link href={back} className="text-blue-600 hover:underline">
          ← Back to course
        </Link>
      </div>

      <form
        action="/api/lessons/update"
        method="POST"
        className="bg-white p-6 rounded shadow space-y-4"
      >
        {/* Hidden identifiers */}
        <input type="hidden" name="id" value={lesson.id} />
        <input
          type="hidden"
          name="redirect_to"
          value={`${back}#module-${lesson.module_id}`}
        />

        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            name="title"
            defaultValue={lesson.title}
            required
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Ordering</label>
          <input
            type="number"
            name="ordering"
            min={1}
            defaultValue={lesson.ordering ?? 1}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Content (HTML allowed)
          </label>
          <textarea
            name="content"
            rows={10}
            defaultValue={lesson.content ?? ""}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>

        {/* NEW: optional fields included so API can update them */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Type</span>
            <select
              name="type"
              defaultValue={lesson.type ?? "article"}
              className="mt-1 w-full border rounded px-3 py-2"
            >
              <option value="article">Article</option>
              <option value="video">Video</option>
              <option value="image">Image</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium">Image URL (optional)</span>
            <input
              name="image_url"
              type="url"
              defaultValue={lesson.image_url ?? ""}
              placeholder="https://…"
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Save Lesson
          </button>
          <Link
            href={back}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
