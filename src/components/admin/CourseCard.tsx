// src/components/admin/CourseCard.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Course } from "@/lib/types";

interface CourseCardProps {
  course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
  const [loading, setLoading] = useState(false);
  const [archived, setArchived] = useState(course.archived);

  const handleArchive = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/archive-course", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: course.id }),
    });
    const json = await res.json();
    if (json.error) {
      alert("Error archiving: " + json.error);
    } else {
      setArchived(true);
    }
    setLoading(false);
  };

  const handleUnarchive = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/unarchive-course", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: course.id }),
    });
    const json = await res.json();
    if (json.error) {
      alert("Error unarchiving: " + json.error);
    } else {
      setArchived(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    setLoading(true);
    const res = await fetch("/api/admin/delete-course", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: course.id }),
    });
    const json = await res.json();
    if (json.error) {
      alert("Error deleting: " + json.error);
    } else {
      // remove card from UI
      window.location.reload();
    }
    setLoading(false);
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
