// src/components/admin/CourseCard.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Course } from "@/lib/types";

interface CourseCardProps {
  course: Course;
  onDeleted?: (id: string) => void;
  onArchivedChange?: (id: string, archived: boolean) => void;
}

type ApiResult = { error?: string };

export default function CourseCard({
  course,
  onDeleted,
  onArchivedChange,
}: CourseCardProps) {
  const [loadingAction, setLoadingAction] = useState<
    "archive" | "unarchive" | "delete" | null
  >(null);
  const [archived, setArchived] = useState<boolean>(Boolean(course.archived));

  const call = async (url: string, body: unknown): Promise<ApiResult> => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as ApiResult;
    if (!res.ok || json.error) {
      throw new Error(json.error || `Request failed: ${res.status}`);
    }
    return json;
  };

  const handleArchive = async () => {
    try {
      setLoadingAction("archive");
      await call("/api/admin/archive-course", { courseId: course.id });
      setArchived(true);
      if (onArchivedChange) onArchivedChange(course.id, true);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUnarchive = async () => {
    try {
      setLoadingAction("unarchive");
      await call("/api/admin/unarchive-course", { courseId: course.id });
      setArchived(false);
      if (onArchivedChange) onArchivedChange(course.id, false);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    try {
      setLoadingAction("delete");
      await call("/api/admin/delete-course", { courseId: course.id });
      if (onDeleted) onDeleted(course.id);
      else window.location.reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoadingAction(null);
    }
  };

  const isBusy = Boolean(loadingAction);
  const created = new Date(course.created_at);

  return (
    <div
      className={`bg-white rounded-lg shadow p-4 flex flex-col ${
        archived ? "opacity-60" : ""
      }`}
    >
      {course.image_url && (
        <div className="relative w-full h-40 mb-4 rounded overflow-hidden bg-gray-100">
          <Image
            src={course.image_url}
            alt={course.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">{course.title}</h2>
        {archived && (
          <span className="inline-flex items-center text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">
            Archived
          </span>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Created on {created.toLocaleDateString()}
      </p>

      <div className="mt-auto flex flex-wrap gap-2">
        {!archived ? (
          <>
            <Link href={`/admin/courses/edit/${course.id}`}>
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={isBusy}
              >
                Edit
              </button>
            </Link>

            <button
              onClick={handleArchive}
              disabled={isBusy}
              className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              {loadingAction === "archive" ? "…" : "Archive"}
            </button>
          </>
        ) : (
          <button
            onClick={handleUnarchive}
            disabled={isBusy}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loadingAction === "unarchive" ? "…" : "Unarchive"}
          </button>
        )}

        <button
          onClick={handleDelete}
          disabled={isBusy}
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {loadingAction === "delete" ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
