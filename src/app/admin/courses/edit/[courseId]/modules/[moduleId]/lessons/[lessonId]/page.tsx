// src/app/admin/courses/edit/[courseId]/modules/[moduleId]/lessons/[lessonId]/page.tsx
import React from "react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Lesson } from "@/lib/types";

interface PageProps {
  params: {
    courseId: string;
    moduleId: string;
    lessonId: string;
  };
}

export default async function EditLessonPage({ params }: PageProps) {
  const { lessonId } = params;

  const { data, error } = await supabaseAdmin
    .from("lessons")
    .select("id, module_id, title, content, type, ordering, image_url")
    .eq("id", lessonId)
    .single();

  if (error || !data) {
    return (
      <div className="p-6">
        <p className="text-red-600">
          Error loading lesson{error ? `: ${error.message}` : ""}
        </p>
      </div>
    );
  }

  const lesson = data as Lesson;

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-semibold mb-4">Edit Lesson</h1>
      <form
        action="/api/admin/update-lesson"
        method="post"
        className="space-y-4"
      >
        <input type="hidden" name="id" value={lesson.id} />
        <input type="hidden" name="module_id" value={lesson.module_id} />

        <label className="block">
          <span className="font-medium">Title</span>
          <input
            name="title"
            defaultValue={lesson.title}
            required
            className="w-full border rounded p-2"
          />
        </label>

        <label className="block">
          <span className="font-medium">Content</span>
          <textarea
            name="content"
            defaultValue={lesson.content}
            rows={6}
            required
            className="w-full border rounded p-2"
          />
        </label>

        <label className="block">
          <span className="font-medium">Type</span>
          <select
            name="type"
            defaultValue={lesson.type}
            required
            className="w-full border rounded p-2"
          >
            <option value="article">Article</option>
            <option value="video">Video</option>
            <option value="image">Image</option>
          </select>
        </label>

        <label className="block">
          <span className="font-medium">Ordering</span>
          <input
            name="ordering"
            type="number"
            defaultValue={lesson.ordering}
            required
            className="w-full border rounded p-2"
          />
        </label>

        <label className="block">
          <span className="font-medium">Image URL</span>
          <input
            name="image_url"
            type="url"
            defaultValue={lesson.image_url || ""}
            className="w-full border rounded p-2"
          />
        </label>

        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Save Lesson
        </button>
      </form>
    </div>
  );
}
