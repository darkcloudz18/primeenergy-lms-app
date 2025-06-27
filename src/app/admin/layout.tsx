// src/app/admin/layout.tsx
import Link from "next/link";
import {
  PhotoIcon,
  BookOpenIcon,
  AcademicCapIcon,
  TrophyIcon,
  UsersIcon,
  FolderOpenIcon,
  PlusCircleIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import React from "react";

export const metadata = {
  title: "Admin",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // these can live here or be imported from /components/admin/Sidebar.tsx
  const topLinks = [
    { label: "Dashboard", href: "/admin/dashboard", icon: BookOpenIcon },
    { label: "My Profile", href: "/admin/profile", icon: PencilIcon },
    {
      label: "Enrolled Courses",
      href: "/admin/enrollments",
      icon: FolderOpenIcon,
    },
  ];
  const instructorLinks = [
    { label: "My Courses", href: "/admin/courses", icon: FolderOpenIcon },
    { label: "Announcements", href: "/admin/announcements", icon: PencilIcon },
    {
      label: "Quiz Attempts",
      href: "/admin/quiz-attempts",
      icon: AcademicCapIcon,
    },
    { label: "Certificates", href: "/admin/certificates", icon: TrophyIcon },
    { label: "Analytics", href: "/admin/analytics", icon: UsersIcon },
    { label: "Settings", href: "/admin/settings", icon: PencilIcon },
    { label: "Logout", href: "/api/auth/logout", icon: PencilIcon },
  ];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-green-500 text-white rounded-full flex items-center justify-center font-medium">
              A
            </div>
            <div>
              <h3 className="text-lg font-semibold">Admin</h3>
              <div className="flex text-yellow-400 text-xs">
                {Array.from({ length: 5 }).map((_, i) => (
                  <PhotoIcon key={i} className="h-4 w-4" />
                ))}
              </div>
            </div>
          </div>
          <Link
            href="/admin/create-course"
            className="mt-4 w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded"
          >
            <PlusCircleIcon className="h-5 w-5" />
            <span>Create a New Course</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 space-y-1">
          {topLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center px-3 py-2 text-gray-700 rounded hover:bg-gray-100"
            >
              <Icon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
              {label}
            </Link>
          ))}

          <div className="mt-6 border-t pt-4 text-xs text-gray-500 uppercase font-semibold">
            Instructor
          </div>
          {instructorLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center px-3 py-2 text-gray-700 rounded hover:bg-gray-100"
            >
              <Icon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">{children}</main>
    </div>
  );
}
