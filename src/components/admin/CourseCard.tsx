"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Course } from "@/lib/types";

interface Props {
  course: Course;
  onArchived?: (archived: boolean) => void;
  onDeleted?: () => void;
}

export default function CourseCard({ course, onArchived, onDeleted }: Props) {
  const [loading, setLoading] = useState(false);
  const [archived, setArchived] = useState<boolean>(!!course.archived);

  const post = async (url: string, body: unknown) => {
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json?.error)
        throw new Error(json?.error || "Request failed");
      return json as { ok: true };
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    await post("/api/admin/archive-course", { courseId: course.id });
    setArchived(true);
    onArchived?.(true);
  };

  const handleUnarchive = async () => {
    await post("/api/admin/unarchive-course", { courseId: course.id });
    setArchived(false);
    onArchived?.(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    await post("/api/admin/delete-course", { courseId: course.id });
    onDeleted?.();
  };

  return (
    <div
      className={
        "bg-white rounded-lg shadow p-4 flex flex-col " +
        (archived ? "opacity-50" : "")
      }
    >
      {course.image_url && (
        <div className="relative w-full h-40 mb-4 rounded overflow-hidden">
          <Image
            src={course.image_url}
            alt={course.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      <h2 className="text-lg font-semibold">{course.title}</h2>
      <p className="text-sm text-gray-500 mb-4">
        Created on {new Date(course.created_at).toLocaleDateString()}
      </p>

      <div className="mt-auto flex flex-wrap gap-2">
        {!archived ? (
          <>
            <Link href={`/admin/courses/edit/${course.id}`}>
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={loading}
              >
                Edit
              </button>
            </Link>

            <button
              onClick={handleArchive}
              disabled={loading}
              className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              {loading ? "…" : "Archive"}
            </button>
          </>
        ) : (
          <button
            onClick={handleUnarchive}
            disabled={loading}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "…" : "Unarchive"}
          </button>
        )}

        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
