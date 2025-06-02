// src/app/courses/[courseId]/components/CourseHeader.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import {
  UsersIcon,
  CheckBadgeIcon,
  TagIcon,
  PuzzlePieceIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface CourseHeaderProps {
  courseId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  enrolledCount: number;
  category?: string;
  level?: string;
  tag?: string;
}

export default function CourseHeader({
  courseId,
  title,
  description,
  imageUrl,
  enrolledCount,
  category,
  level,
  tag,
}: CourseHeaderProps) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const user = session?.user;

  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from("enrollments")
      .select("id")
      .match({ course_id: courseId, user_id: user.id })
      .maybeSingle()
      .then(({ data }) => {
        setEnrolled(!!data);
        setLoading(false);
      });
  }, [supabase, courseId, user]);

  async function toggleEnroll() {
    if (!user) {
      alert("Please sign in first");
      return;
    }
    setLoading(true);
    if (enrolled) {
      await supabase
        .from("enrollments")
        .delete()
        .match({ course_id: courseId, user_id: user.id });
      setEnrolled(false);
    } else {
      await supabase
        .from("enrollments")
        .insert({ course_id: courseId, user_id: user.id });
      setEnrolled(true);
    }
    setLoading(false);
  }

  return (
    <header className="grid grid-cols-3 gap-6 items-start bg-white p-6 rounded shadow">
      <div className="col-span-2 space-y-4">
        <h1 className="text-3xl font-bold">{title}</h1>
        {imageUrl && (
          <div className="w-full h-64 relative rounded-lg overflow-hidden">
            <Image src={imageUrl} alt={title} fill className="object-cover" />
          </div>
        )}
        {description && (
          <p className="text-gray-700 leading-relaxed">{description}</p>
        )}
      </div>

      <aside className="space-y-4">
        <button
          onClick={toggleEnroll}
          disabled={loading}
          className={`w-full px-4 py-2 rounded text-white ${
            enrolled
              ? "bg-red-600 hover:bg-red-700"
              : "bg-green-600 hover:bg-green-700"
          } disabled:opacity-50`}
        >
          {loading ? "…" : enrolled ? "Unenroll" : "Enroll now"}
        </button>

        <ul className="bg-gray-50 border rounded divide-y">
          <li className="flex items-center px-4 py-2">
            <UsersIcon className="w-5 h-5 text-gray-600 mr-2" />
            <span>{enrolledCount} enrolled</span>
          </li>
          <li className="flex items-center px-4 py-2">
            <CheckBadgeIcon className="w-5 h-5 text-gray-600 mr-2" />
            <span>Certificate of completion</span>
          </li>
          {category && (
            <li className="flex items-center px-4 py-2">
              <PuzzlePieceIcon className="w-5 h-5 text-gray-600 mr-2" />
              <span>Category: {category}</span>
            </li>
          )}
          {level && (
            <li className="flex items-center px-4 py-2">
              <ChevronRightIcon className="w-5 h-5 text-gray-600 mr-2 transform rotate-90" />
              <span>Level: {level}</span>
            </li>
          )}
          {tag && (
            <li className="flex items-center px-4 py-2">
              <TagIcon className="w-5 h-5 text-gray-600 mr-2" />
              <span>Tag: {tag}</span>
            </li>
          )}
        </ul>
      </aside>
    </header>
  );
}
