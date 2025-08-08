"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpenIcon,
  AcademicCapIcon,
  UsersIcon,
  CheckBadgeIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

// ───────────────── Types (keep local & simple) ─────────────────
type CourseRow = {
  id: string;
  title: string;
  image_url: string | null;
  archived: boolean;
  created_at: string;
};

type EnrollmentRow = { course_id: string; user_id: string; created_at: string };

type ModuleRow = { id: string; course_id: string };
type LessonRow = { id: string; module_id: string };

type CardCourse = {
  id: string;
  title: string;
  image_url: string | null;
  archived: boolean;
  enrolled: number;
  lessons: number;
};

function titleCase(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function nameFromEmail(email?: string | null) {
  const local = (email ?? "").split("@")[0] || "Tutor";
  return titleCase(local.replace(/[._-]+/g, " "));
}

export default function TutorDashboardPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const user = session?.user ?? null;

  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>("Tutor");

  const [courses, setCourses] = useState<CardCourse[]>([]);
  const [totalStudentsDistinct, setTotalStudentsDistinct] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);

  // chart: enrollments per day for last 30 days
  const [enrollmentsByDay, setEnrollmentsByDay] = useState<
    { day: string; count: number }[]
  >([]);

  const totalCourses = courses.length;
  const activeCourses = useMemo(
    () => courses.filter((c) => !c.archived).length,
    [courses]
  );

  // ───────────────── load dashboard data ─────────────────
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);

      // 0) Greeting from profiles.first_name (fallback to email local-part)
      {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name")
          .eq("id", user.id)
          .single();

        if (!error && data?.first_name) {
          setDisplayName(titleCase(data.first_name));
        } else {
          setDisplayName(nameFromEmail(user.email));
        }
      }

      // 1) Tutor's courses
      const { data: courseRows, error: courseErr } = await supabase
        .from("courses")
        .select("id, title, image_url, archived, created_at")
        .eq("instructor_id", user.id)
        .order("created_at", { ascending: false });

      if (courseErr) {
        console.error("TutorDashboard: courses error", courseErr);
        setCourses([]);
        setTotalStudentsDistinct(0);
        setTotalLessons(0);
        setEnrollmentsByDay([]);
        setLoading(false);
        return;
      }

      const courseList = (courseRows ?? []) as CourseRow[];
      if (courseList.length === 0) {
        setCourses([]);
        setTotalStudentsDistinct(0);
        setTotalLessons(0);
        setEnrollmentsByDay(
          buildLastNDays(30).map((d) => ({ day: d, count: 0 }))
        );
        setLoading(false);
        return;
      }

      const courseIds = courseList.map((c) => c.id);

      // 2) Enrollments for these courses (include created_at for chart)
      const { data: enrRows, error: enrErr } = await supabase
        .from("enrollments")
        .select("course_id, user_id, created_at")
        .in("course_id", courseIds);

      if (enrErr) {
        console.error("TutorDashboard: enrollments error", enrErr);
      }
      const enrollments = (enrRows ?? []) as EnrollmentRow[];

      // counts by course & distinct students
      const enrolledByCourse = new Map<string, number>();
      const distinctStudents = new Set<string>();
      enrollments.forEach((e) => {
        distinctStudents.add(e.user_id);
        enrolledByCourse.set(
          e.course_id,
          (enrolledByCourse.get(e.course_id) ?? 0) + 1
        );
      });
      setTotalStudentsDistinct(distinctStudents.size);

      // 3) Modules for these courses
      const { data: modRows, error: modErr } = await supabase
        .from("modules")
        .select("id, course_id")
        .in("course_id", courseIds);

      if (modErr) {
        console.error("TutorDashboard: modules error", modErr);
      }
      const modules = (modRows ?? []) as ModuleRow[];
      const moduleIds = modules.map((m) => m.id);

      // 4) Lessons for those modules
      let lessons: LessonRow[] = [];
      if (moduleIds.length > 0) {
        const { data: lesRows, error: lesErr } = await supabase
          .from("lessons")
          .select("id, module_id")
          .in("module_id", moduleIds);

        if (lesErr) {
          console.error("TutorDashboard: lessons error", lesErr);
        }
        lessons = (lesRows ?? []) as LessonRow[];
      }

      // Count lessons per course
      const modsByCourse = new Map<string, string[]>();
      modules.forEach((m) => {
        const arr = modsByCourse.get(m.course_id) ?? [];
        arr.push(m.id);
        modsByCourse.set(m.course_id, arr);
      });

      const lessonsByCourse = new Map<string, number>();
      for (const [courseId, modIds] of modsByCourse.entries()) {
        const count = lessons.reduce(
          (acc, l) => (modIds.includes(l.module_id) ? acc + 1 : acc),
          0
        );
        lessonsByCourse.set(courseId, count);
      }

      // Totals
      setTotalLessons(lessons.length);

      // 5) Build card list
      const built: CardCourse[] = courseList.map((c) => ({
        id: c.id,
        title: c.title,
        image_url: c.image_url,
        archived: c.archived,
        enrolled: enrolledByCourse.get(c.id) ?? 0,
        lessons: lessonsByCourse.get(c.id) ?? 0,
      }));

      // Active first
      const active = built.filter((c) => !c.archived);
      const archived = built.filter((c) => c.archived);
      setCourses([...active, ...archived]);

      // 6) Chart data: last 30 days by day
      const last30 = buildLastNDays(30);
      const counts = new Map<string, number>(last30.map((d) => [d, 0]));
      enrollments.forEach((e) => {
        const day = e.created_at?.slice(0, 10); // YYYY-MM-DD
        if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
      });
      setEnrollmentsByDay(
        last30.map((d) => ({ day: d, count: counts.get(d) ?? 0 }))
      );

      setLoading(false);
    })();
  }, [supabase, user?.id, user?.email]);

  // ───────────────── render ─────────────────
  if (!user) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">Tutor Dashboard</h1>
        <p className="mt-4 text-gray-600">
          Please sign in to see your dashboard.
        </p>
      </main>
    );
  }

  const initial = displayName.charAt(0).toUpperCase() || "T";

  const maxCount = Math.max(1, ...enrollmentsByDay.map((d) => d.count));

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Greeting */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-green-600 text-white grid place-items-center">
          {initial}
        </div>
        <div>
          <p className="text-sm text-gray-500">Hello,</p>
          <p className="text-lg font-semibold">{displayName}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <section className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <WrenchScrewdriverIcon className="w-5 h-5" />
            Quick Actions
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/tutor/courses/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded border hover:bg-gray-50"
          >
            <PlusCircleIcon className="w-5 h-5" />
            Create Course
          </Link>
          <Link
            href="/dashboard/tutor"
            className="inline-flex items-center gap-2 px-4 py-2 rounded border hover:bg-gray-50"
          >
            <PencilSquareIcon className="w-5 h-5" />
            Manage Courses
          </Link>
          <Link
            href="/dashboard/tutor/settings"
            className="inline-flex items-center gap-2 px-4 py-2 rounded border hover:bg-gray-50"
          >
            <AcademicCapIcon className="w-5 h-5" />
            Settings
          </Link>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-4 py-2 rounded border hover:bg-gray-50"
          >
            <BookOpenIcon className="w-5 h-5" />
            Browse Catalog
          </Link>
        </div>
      </section>

      {/* Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<BookOpenIcon className="w-6 h-6 text-green-700" />}
          label="My Courses"
          value={totalCourses}
        />
        <StatCard
          icon={<CheckBadgeIcon className="w-6 h-6 text-green-700" />}
          label="Active Courses"
          value={activeCourses}
        />
        <StatCard
          icon={<UsersIcon className="w-6 h-6 text-green-700" />}
          label="Total Students"
          value={totalStudentsDistinct}
        />
        <StatCard
          icon={<AcademicCapIcon className="w-6 h-6 text-green-700" />}
          label="Total Lessons"
          value={totalLessons}
        />
      </section>

      {/* Enrollments chart (last 30 days) */}
      <section className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5" />
            Enrollments (last 30 days)
          </h2>
        </div>
        {enrollmentsByDay.length === 0 ? (
          <p className="text-gray-600">No data yet.</p>
        ) : (
          <div className="h-36 flex items-end gap-1">
            {enrollmentsByDay.map((d) => {
              const h = Math.round((d.count / maxCount) * 100);
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-green-500 rounded-t"
                    style={{ height: `${h}%` }}
                    title={`${d.day}: ${d.count}`}
                  />
                </div>
              );
            })}
          </div>
        )}
        {/* X-axis labels: show 6 evenly spaced ticks */}
        {enrollmentsByDay.length > 0 && (
          <div className="mt-2 text-xs text-gray-600 grid grid-cols-6">
            {axisTicks(enrollmentsByDay, 6).map((t) => (
              <div key={t} className="text-center">
                {t.slice(5)}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Courses List */}
      <section className="bg-white rounded-lg shadow">
        <div className="px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">Your Courses</h2>
        </div>

        {loading ? (
          <p className="p-6 text-gray-600">Loading…</p>
        ) : courses.length === 0 ? (
          <p className="p-6 text-gray-600">
            You haven’t created any courses yet.
          </p>
        ) : (
          <ul className="divide-y">
            {courses.map((c) => {
              const hasImage =
                typeof c.image_url === "string" &&
                /^https?:\/\//.test(c.image_url);

              return (
                <li key={c.id} className="p-4 flex gap-4 items-center">
                  <div className="relative h-20 w-32 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                    {hasImage && (
                      <Image
                        src={c.image_url!}
                        alt={c.title}
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/courses/${c.id}`}
                        className="font-medium hover:text-green-700"
                      >
                        {c.title}
                      </Link>
                      {c.archived ? (
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                          Archived
                        </span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mt-1">
                      {c.enrolled} enrolled • {c.lessons} lesson
                      {c.lessons === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/courses/${c.id}`}
                      className="text-sm px-3 py-2 rounded border hover:bg-gray-50"
                    >
                      View
                    </Link>
                    <Link
                      href={`/dashboard/tutor/courses/${c.id}/edit`}
                      className="text-sm px-3 py-2 rounded border hover:bg-gray-50"
                    >
                      Edit
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

// ───────────────── helpers ─────────────────
function buildLastNDays(n: number) {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
  }
  return out;
}

function axisTicks(data: { day: string; count: number }[], numTicks: number) {
  if (data.length === 0 || numTicks <= 1) return data.map((d) => d.day);
  const step = Math.max(1, Math.floor(data.length / numTicks));
  const out: string[] = [];
  for (let i = 0; i < data.length; i += step) out.push(data[i].day);
  if (out[out.length - 1] !== data[data.length - 1].day)
    out.push(data[data.length - 1].day);
  return out;
}

// ───────────────── small stat card ─────────────────
function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
      <div className="h-10 w-10 grid place-items-center bg-green-100 rounded-full">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-sm text-gray-600">{label}</div>
      </div>
    </div>
  );
}
