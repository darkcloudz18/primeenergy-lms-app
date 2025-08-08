"use client";

import Link from "next/link";
import {
  PhotoIcon,
  AcademicCapIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useProfile } from "@/hooks/useProfile";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = useProfile();
  const supabase = useSupabaseClient();
  const router = useRouter();

  const first = (profile?.first_name || "Student").trim();
  const initial = first ? first[0]!.toUpperCase() : "S";

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login"); // or /login
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-6 flex items-center space-x-3">
          <div className="h-10 w-10 bg-green-500 text-white rounded-full flex items-center justify-center font-medium">
            {initial}
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              Hello, {first.charAt(0).toUpperCase() + first.slice(1)}
            </h3>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 space-y-1 text-gray-700">
          <Link
            href="/dashboard/student"
            className="group flex items-center px-3 py-2 rounded hover:bg-gray-100"
          >
            <PhotoIcon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
            Dashboard
          </Link>
          <Link
            href="/dashboard/student/courses"
            className="group flex items-center px-3 py-2 rounded hover:bg-gray-100"
          >
            <AcademicCapIcon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
            Enrolled Courses
          </Link>
          <Link
            href="/dashboard/student/settings"
            className="group flex items-center px-3 py-2 rounded hover:bg-gray-100"
          >
            <Cog6ToothIcon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
            Settings
          </Link>
          <button
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
