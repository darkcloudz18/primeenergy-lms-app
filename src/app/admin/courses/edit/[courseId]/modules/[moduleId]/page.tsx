// src/app/admin/courses/edit/[courseId]/modules/[moduleId]/page.tsx
import React from "react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Module } from "@/lib/types";

interface PageProps {
  params: {
    courseId: string;
    moduleId: string;
  };
}

export default async function EditModulePage({ params }: PageProps) {
  const { moduleId } = params;

  // fetch exactly the columns your Module interface needs
  const { data, error } = await supabaseAdmin
    .from("modules")
    .select("id, course_id, title, ordering, quiz_id")
    .eq("id", moduleId)
    .single();

  if (error || !data) {
    return (
      <div className="p-6">
        <p className="text-red-600">
          Error loading module{error ? `: ${error.message}` : ""}
        </p>
      </div>
    );
  }

  // cast to your type
  const moduleRow = data as Module;

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-semibold mb-4">Edit Module</h1>
      <form
        action="/api/admin/update-module"
        method="post"
        className="space-y-4"
      >
        {/* hidden IDs */}
        <input type="hidden" name="id" value={moduleRow.id} />
        <input type="hidden" name="course_id" value={moduleRow.course_id} />

        {/* Title */}
        <div>
          <label className="block font-medium mb-1">Title</label>
          <input
            type="text"
            name="title"
            defaultValue={moduleRow.title}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Ordering */}
        <div>
          <label className="block font-medium mb-1">Ordering</label>
          <input
            type="number"
            name="ordering"
            defaultValue={moduleRow.ordering}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Quiz ID (optional) */}
        <div>
          <label className="block font-medium mb-1">Quiz ID</label>
          <input
            type="text"
            name="quiz_id"
            defaultValue={moduleRow.quiz_id || ""}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Save Module
        </button>
      </form>
    </div>
  );
}
