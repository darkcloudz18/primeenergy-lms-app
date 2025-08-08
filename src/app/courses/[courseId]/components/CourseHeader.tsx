"use client";

import Image from "next/image";
import Link from "next/link";
import {
  UsersIcon,
  CheckBadgeIcon,
  TagIcon,
  PuzzlePieceIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface Props {
  courseId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  enrolledCount: number;
  category?: string;
  level?: string;
  tag?: string;

  isEnrolled: boolean;
  loadingEnroll: boolean;
  onToggleEnroll: () => void;

  /** Only if enrolled and you computed it above */
  firstLessonPath: string | null;
}

export default function CourseHeader({
  title,
  description,
  imageUrl,
  enrolledCount,
  category,
  level,
  tag,
  isEnrolled,
  loadingEnroll,
  onToggleEnroll,
  firstLessonPath,
}: Props) {
  return (
    <header className="grid grid-cols-3 gap-6 items-start bg-white p-6 rounded shadow">
      {/* Left: Title / Image / Description */}
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

      {/* Right‐side card */}
      <aside className="space-y-4">
        {!isEnrolled ? (
          <button
            onClick={onToggleEnroll}
            disabled={loadingEnroll}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loadingEnroll ? "…" : "Enroll now"}
          </button>
        ) : (
          firstLessonPath && (
            <>
              <Link
                href={firstLessonPath}
                className="text-center block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Start Learning
              </Link>
              <button
                onClick={onToggleEnroll}
                disabled={loadingEnroll}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loadingEnroll ? "…" : "Unenroll"}
              </button>
            </>
          )
        )}

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
