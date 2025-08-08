// src/app/dashboard/student/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpenIcon,
  AcademicCapIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

/* ───────── Types for the queries we actually use ───────── */
type CourseLite = { id: string; title: string; image_url: string | null };
type ModuleRow = { id: string; course_id: string };
type LessonRow = { id: string; module_id: string };
type CompletionRow = { lesson_id: string };

type CardCourse = CourseLite & {
  totalLessons: number;
  completedLessons: number;
};

/* ───────── Small helpers ───────── */
const titleCase = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const localPart = (email?: string | null) =>
  (email ?? "").split("@")[0] ?? "Student";

/* ───────── Page ───────── */
export default function StudentDashboardPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const user = session?.user ?? null;

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CardCourse[]>([]);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [displayName, setDisplayName] = useState<string>("Student");

  // Derived counts
  const activeCount = useMemo(
    () =>
      cards.filter(
        (c) =>
          c.totalLessons > 0 &&
          c.completedLessons > 0 &&
          c.completedLessons < c.totalLessons
      ).length,
    [cards]
  );

  const completedCount = useMemo(
    () =>
      cards.filter(
        (c) => c.totalLessons > 0 && c.completedLessons >= c.totalLessons
      ).length,
    [cards]
  );

  // 1) Load greeting name (from profiles → first/last) with fallbacks
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

      if (error) {
        // fallback to email local part if profiles row missing or blocked by RLS
        const fallback = titleCase(localPart(user.email));
        setDisplayName(fallback || "Student");
        return;
      }

      const raw =
        data?.first_name && data?.last_name
          ? `${data.first_name} ${data.last_name}`
          : data?.first_name ||
            data?.last_name ||
            localPart(user.email) ||
            "Student";

      setDisplayName(titleCase(raw));
    })();
  }, [supabase, user]); // keep deps minimal & correct

  // 2) Load enrollments and progress
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);

      // Enrollments → course IDs
      const { data: enrollRows, error: enrErr } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user.id);

      if (enrErr) {
        console.error("Dashboard: enrollments error", enrErr);
        setCards([]);
        setEnrolledCount(0);
        setLoading(false);
        return;
      }

      const courseIds = (enrollRows ?? []).map((r) => r.course_id as string);
      setEnrolledCount(courseIds.length);

      if (courseIds.length === 0) {
        setCards([]);
        setLoading(false);
        return;
      }

      // Courses to display
      const { data: courseRows, error: courseErr } = await supabase
        .from("courses")
        .select("id, title, image_url")
        .in("id", courseIds);

      if (courseErr) {
        console.error("Dashboard: courses error", courseErr);
        setCards([]);
        setLoading(false);
        return;
      }
      const courses = (courseRows ?? []) as CourseLite[];

      // Modules for those courses
      const { data: moduleRows, error: modErr } = await supabase
        .from("modules")
        .select("id, course_id")
        .in("course_id", courseIds);

      if (modErr) {
        console.error("Dashboard: modules error", modErr);
        setCards([]);
        setLoading(false);
        return;
      }
      const modules = (moduleRows ?? []) as ModuleRow[];
      const moduleIds = modules.map((m) => m.id);

      // Lessons for those modules
      let lessons: LessonRow[] = [];
      if (moduleIds.length > 0) {
        const { data: lessonRows, error: lessonErr } = await supabase
          .from("lessons")
          .select("id, module_id")
          .in("module_id", moduleIds);

        if (lessonErr) {
          console.error("Dashboard: lessons error", lessonErr);
          setCards([]);
          setLoading(false);
          return;
        }
        lessons = (lessonRows ?? []) as LessonRow[];
      }

      // Build courseId -> lessonIds[]
      const moduleByCourse = new Map<string, string[]>();
      modules.forEach((m) => {
        const arr = moduleByCourse.get(m.course_id) ?? [];
        arr.push(m.id);
        moduleByCourse.set(m.course_id, arr);
      });

      const lessonsByCourse = new Map<string, string[]>();
      for (const [courseId, mods] of moduleByCourse.entries()) {
        const ids = lessons
          .filter((l) => mods.includes(l.module_id))
          .map((l) => l.id);
        lessonsByCourse.set(courseId, ids);
      }

      // User lesson completions
      // ⚠️ Change table name if yours is different (e.g., "lesson_progress")
      const { data: compRows, error: compErr } = await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("user_id", user.id);

      if (compErr) {
        console.error("Dashboard: completions error", compErr);
        setCards([]);
        setLoading(false);
        return;
      }

      const completedSet = new Set(
        (compRows ?? []).map((r) => (r as CompletionRow).lesson_id)
      );

      // Build card data per course
      const built: CardCourse[] = courses.map((c) => {
        const lessonIds = lessonsByCourse.get(c.id) ?? [];
        const total = lessonIds.length;
        const completed = lessonIds.reduce(
          (acc, id) => acc + (completedSet.has(id) ? 1 : 0),
          0
        );
        return {
          id: c.id,
          title: c.title,
          image_url: c.image_url,
          totalLessons: total,
          completedLessons: completed,
        };
      });

      // Sort: in-progress (by % desc), then completed, then not started
      const inProgress = built
        .filter(
          (b) =>
            b.totalLessons > 0 &&
            b.completedLessons >= 0 &&
            b.completedLessons < b.totalLessons
        )
        .sort(
          (a, b) =>
            b.completedLessons / Math.max(b.totalLessons, 1) -
            a.completedLessons / Math.max(a.totalLessons, 1)
        );

      const completed = built.filter(
        (b) => b.totalLessons > 0 && b.completedLessons >= b.totalLessons
      );
      const notStarted = built.filter((b) => b.totalLessons === 0);

      setCards([...inProgress, ...completed, ...notStarted]);
      setLoading(false);
    })();
  }, [supabase, user?.id]);

  if (!user) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">My Dashboard</h1>
        <p className="mt-4 text-gray-600">
          Please sign in to see your dashboard.
        </p>
      </main>
    );
  }

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Greeting */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-green-600 text-white grid place-items-center">
          {initial || "U"}
        </div>
        <div>
          <p className="text-sm text-gray-500">Hello,</p>
          <p className="text-lg font-semibold">{displayName}</p>
        </div>
      </div>

      {/* Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<BookOpenIcon className="w-6 h-6 text-green-700" />}
          label="Enrolled Courses"
          value={enrolledCount}
        />
        <StatCard
          icon={<AcademicCapIcon className="w-6 h-6 text-green-700" />}
          label="Active Courses"
          value={activeCount}
        />
        <StatCard
          icon={<CheckBadgeIcon className="w-6 h-6 text-green-700" />}
          label="Completed Courses"
          value={completedCount}
        />
      </section>

      {/* In Progress */}
      <section className="bg-white rounded-lg shadow">
        <div className="px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">In Progress Courses</h2>
        </div>

        {loading ? (
          <p className="p-6 text-gray-600">Loading…</p>
        ) : cards.length === 0 ? (
          <p className="p-6 text-gray-600">
            You haven’t enrolled in any courses yet.
          </p>
        ) : (
          <ul className="divide-y">
            {cards.map((c) => {
              const pct =
                c.totalLessons > 0
                  ? Math.round((c.completedLessons / c.totalLessons) * 100)
                  : 0;
              const hasImage =
                typeof c.image_url === "string" &&
                /^https?:\/\//.test(c.image_url);

              return (
                <li key={c.id} className="p-4 flex gap-4 items-center">
                  {/* Thumb */}
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

                  {/* Body */}
                  <div className="flex-1">
                    <Link
                      href={`/courses/${c.id}`}
                      className="font-medium hover:text-green-700"
                    >
                      {c.title}
                    </Link>
                    <p className="text-sm text-gray-600">
                      Completed lessons: {c.completedLessons} of{" "}
                      {c.totalLessons}
                    </p>

                    {/* Progress */}
                    <div className="mt-2 h-2 w-full bg-gray-200 rounded">
                      <div
                        className="h-2 bg-green-600 rounded"
                        style={{ width: `${pct}%` }}
                        aria-label={`Progress ${pct}%`}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {pct}% Complete
                    </p>
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

/* ——— tiny stat card component ——— */
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
