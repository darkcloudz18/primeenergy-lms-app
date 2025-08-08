// app/(dashboard)/tutor/layout.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useProfile } from "@/hooks/useProfile";
import {
  HomeIcon,
  UsersIcon,
  PlusCircleIcon,
  RectangleStackIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

export default function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = useProfile();
  const supabase = useSupabaseClient();
  const router = useRouter();

  // First name from profile, fallback to "Tutor"
  const rawFirst = (profile?.first_name || "Tutor").trim();
  const first =
    rawFirst.length > 0
      ? rawFirst[0].toUpperCase() + rawFirst.slice(1).toLowerCase()
      : "Tutor";
  const initial = first ? first[0] : "T";

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login"); // same behavior as student
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <aside className="w-64 bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-6 flex items-center space-x-3">
          <div className="h-10 w-10 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold">
            {initial}
          </div>
          <div>
            <h3 className="text-lg font-semibold">Hello, {first}</h3>
            <p className="text-xs text-gray-500">Tutor Dashboard</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-1 text-gray-700">
          <Link
            href="/dashboard/tutor"
            className="group flex items-center px-3 py-2 rounded hover:bg-gray-100"
          >
            <HomeIcon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
            Dashboard
          </Link>

          <Link
            href="/dashboard/tutor/enrolled-students"
            className="group flex items-center px-3 py-2 rounded hover:bg-gray-100"
          >
            <UsersIcon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
            Enrolled Students
          </Link>

          <Link
            href="/courses/new"
            className="group flex items-center px-3 py-2 rounded hover:bg-gray-100"
          >
            <PlusCircleIcon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
            Create Course
          </Link>

          <Link
            href="/dashboard/tutor/my-courses"
            className="group flex items-center px-3 py-2 rounded hover:bg-gray-100"
          >
            <RectangleStackIcon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
            My Courses
          </Link>

          <Link
            href="/dashboard/tutor/settings"
            className="group flex items-center px-3 py-2 rounded hover:bg-gray-100"
          >
            <Cog6ToothIcon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
            Settings
          </Link>

          {/* Logout (Supabase) */}
          <button
            type="button"
            onClick={onLogout}
            className="w-full text-left group flex items-center px-3 py-2 rounded hover:bg-gray-100"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
            Logout
          </button>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
