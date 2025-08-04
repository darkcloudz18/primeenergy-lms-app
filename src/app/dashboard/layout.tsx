// src/app/dashboard/layout.tsx
"use client";

import Link from "next/link";
import {
  PhotoIcon,
  UserIcon,
  AcademicCapIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-6 flex items-center space-x-3">
          <div className="h-10 w-10 bg-green-500 text-white rounded-full flex items-center justify-center font-medium">
            {/* you could render user's initials here */}S
          </div>
          <div>
            <h3 className="text-lg font-semibold">Hello, Student</h3>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 space-y-1 text-gray-700">
          <Link
            href="/dashboard"
            className="group flex items-center px-3 py-2 rounded hover:bg-gray-100"
          >
            <PhotoIcon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
            Dashboard
          </Link>
          <Link
            href="/dashboard/profile"
            className="group flex items-center px-3 py-2 rounded hover:bg-gray-100"
          >
            <UserIcon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
            My Profile
          </Link>
          <Link
            href="/dashboard/courses"
            className="group flex items-center px-3 py-2 rounded hover:bg-gray-100"
          >
            <AcademicCapIcon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
            Enrolled Courses
          </Link>
          <Link
            href="/dashboard/settings"
            className="group flex items-center px-3 py-2 rounded hover:bg-gray-100"
          >
            <Cog6ToothIcon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
            Settings
          </Link>
          <Link
            href="/api/auth/logout"
            className="group flex items-center px-3 py-2 rounded hover:bg-gray-100"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
            Logout
          </Link>
        </nav>
      </aside>

      {/* main content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">{children}</main>
    </div>
  );
}
