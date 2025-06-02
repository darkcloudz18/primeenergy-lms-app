"use client";

import Link from "next/link";
import {
  PhotoIcon,
  BookOpenIcon,
  AcademicCapIcon,
  TrophyIcon,
  UsersIcon,
  FolderOpenIcon,
  CurrencyDollarIcon,
  PlusCircleIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

export default function AdminDashboardPage() {
  // TODO: replace with real fetches
  const completedSteps = 0;
  const totalSteps = 3;
  const profileProgress = (completedSteps / totalSteps) * 100;

  const stats = [
    { label: "Enrolled Courses", value: 0, Icon: UsersIcon },
    { label: "Active Courses", value: 0, Icon: AcademicCapIcon },
    { label: "Completed Courses", value: 0, Icon: TrophyIcon },
    { label: "Total Students", value: 0, Icon: UsersIcon },
    { label: "Total Courses", value: 1, Icon: FolderOpenIcon },
    { label: "Total Earnings", value: `$${0}`, Icon: CurrencyDollarIcon },
  ];

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
      {/* ─── Sidebar ───────────────────────────────────────── */}
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

      {/* ─── Main Content ──────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Profile Completion */}
        <div className="bg-white rounded-lg shadow p-6 flex items-center">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Complete Your Profile</h2>
            <div className="mt-3 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600"
                style={{ width: `${profileProgress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Please complete profile: {completedSteps}/{totalSteps}
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <Link
              href="/admin/profile/photo"
              className="flex items-center text-green-600 hover:underline"
            >
              <PhotoIcon className="h-5 w-5 mr-1" />
              Set Your Profile Photo
            </Link>
            <Link
              href="/admin/profile/bio"
              className="flex items-center text-green-600 hover:underline"
            >
              <PencilIcon className="h-5 w-5 mr-1" />
              Set Your Bio
            </Link>
          </div>
        </div>

        {/* Dashboard Stats */}
        <h3 className="text-xl font-semibold">Dashboard</h3>
        <div className="grid grid-cols-3 gap-6">
          {stats.map(({ label, value, Icon }) => (
            <div
              key={label}
              className="bg-white rounded-lg shadow p-5 flex items-center space-x-4"
            >
              <Icon className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
