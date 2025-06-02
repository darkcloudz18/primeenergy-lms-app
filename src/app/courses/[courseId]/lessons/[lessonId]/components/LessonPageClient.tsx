"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeftIcon,
  EyeIcon,
  LockClosedIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

interface Lesson {
  id: string;
  title: string;
}

interface Props {
  courseTitle: string;
  courseId: string;
  lessons: Lesson[];
  lesson: { id: string; title: string; content: string };
}

export default function LessonPageClient({
  courseTitle,
  courseId,
  lessons,
  lesson,
}: Props) {
  const [tab, setTab] = useState<"overview" | "comments">("overview");
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const markComplete = () =>
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(lesson.id);
      return next;
    });

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* ─── Sidebar ───────────────────────────────────────── */}
      <aside className="w-64 bg-white border-r overflow-y-auto">
        <div className="p-4 border-b">
          <Link
            href={`/courses/${courseId}`}
            className="flex items-center text-gray-700 hover:text-green-600"
          >
            <ChevronLeftIcon className="w-5 h-5 mr-2" />
            <span className="font-medium">{courseTitle}</span>
          </Link>
        </div>
        <nav className="text-sm">
          {lessons.map((lsn, i) => {
            const isActive = lsn.id === lesson.id;
            const done = completed.has(lsn.id);
            return (
              <Link
                key={lsn.id}
                href={`/courses/${courseId}/lessons/${lsn.id}`}
                className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 ${
                  isActive ? "bg-green-50 border-l-4 border-green-500" : ""
                }`}
              >
                <div className="flex items-center space-x-2">
                  {isActive ? (
                    <EyeIcon className="w-4 h-4 text-green-500" />
                  ) : (
                    <LockClosedIcon className="w-4 h-4 text-gray-300" />
                  )}
                  <span className="truncate">
                    {i + 1}. {lsn.title}
                  </span>
                </div>
                {done && <CheckIcon className="w-4 h-4 text-green-500" />}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ─── Main ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sticky header with tabs */}
        <header className="sticky top-0 bg-green-600 text-white flex items-center px-6 h-12 shadow z-10">
          <h2 className="flex-1 text-lg font-semibold">About Lesson</h2>
          <button
            onClick={() => setTab("overview")}
            className={`px-3 py-1 rounded-l ${
              tab === "overview"
                ? "bg-green-800"
                : "bg-green-700 hover:bg-green-800"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setTab("comments")}
            className={`px-3 py-1 rounded-r ${
              tab === "comments"
                ? "bg-green-800"
                : "bg-green-700 hover:bg-green-800"
            }`}
          >
            Comments
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-white p-6">
          {tab === "overview" ? (
            <article
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: lesson.content }}
            />
          ) : (
            <div className="text-gray-600 italic">
              {/* your comments UI */}
              No comments yet.
            </div>
          )}
        </main>
      </div>

      {/* ─── “Mark as Complete” ───────────────────────────── */}
      <button
        onClick={markComplete}
        className="fixed bottom-6 right-6 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow-lg z-20"
      >
        Mark as Complete
      </button>
    </div>
  );
}
