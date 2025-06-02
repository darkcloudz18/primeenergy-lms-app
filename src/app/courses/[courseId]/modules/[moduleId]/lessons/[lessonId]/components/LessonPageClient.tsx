// src/app/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/components/LessonPageClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import type { Lesson } from "@/lib/types";

interface LessonPageClientProps {
  lessonId: string;
}

export default function LessonPageClient({ lessonId }: LessonPageClientProps) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLesson() {
      setLoading(true);
      setError(null);

      // 1️⃣ Fetch the lesson row by its ID.
      //    Notice: we removed any <Lesson> generic on `select()`.
      const { data: rawLesson, error: fetchError } = await supabase
        .from("lessons")
        .select(
          "id, module_id, title, content, type, ordering, image_url, created_at"
        )
        .eq("id", lessonId)
        .single();

      if (fetchError) {
        console.error("Error fetching lesson:", fetchError);
        setError("Failed to load lesson.");
        setLoading(false);
        return;
      }

      // 2️⃣ Cast the returned row to Lesson
      setLesson(rawLesson as Lesson);
      setLoading(false);
    }

    fetchLesson();
  }, [lessonId]);

  if (loading) {
    return <p className="p-6 text-center text-gray-600">Loading lesson…</p>;
  }

  if (error) {
    return <p className="p-6 text-center text-red-600">{error}</p>;
  }

  if (!lesson) {
    return <p className="p-6 text-center text-gray-600">Lesson not found.</p>;
  }

  return (
    <article className="max-w-3xl mx-auto p-6 space-y-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-semibold">{lesson.title}</h1>

      {/* Render based on lesson.type */}
      {lesson.type === "article" && (
        <div
          className="prose prose-lg"
          dangerouslySetInnerHTML={{ __html: lesson.content }}
        />
      )}

      {lesson.type === "video" && (
        <div className="w-full aspect-w-16 aspect-h-9">
          <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: lesson.content }}
          />
        </div>
      )}

      {lesson.type === "image" && lesson.image_url && (
        <div className="relative w-full h-64">
          <Image
            src={lesson.image_url}
            alt={lesson.title}
            fill
            className="object-contain rounded"
          />
        </div>
      )}

      {/* If it’s an image‐type lesson but no URL is provided */}
      {lesson.type === "image" && !lesson.image_url && (
        <p className="text-center text-gray-500">No image available.</p>
      )}
    </article>
  );
}
