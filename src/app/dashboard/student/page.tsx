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

type CourseLite = {
  id: string;
  title: string;
  image_url: string | null;
};

type EnrollmentRow = { course_id: string };
type ModuleRow = { id: string; course_id: string };
type LessonRow = { id: string; module_id: string };
type CompletionRow = { lesson_id: string };

type CardCourse = CourseLite & {
  totalLessons: number;
  completedLessons: number;
};

type CertRow = {
  id: string;
  course_id: string;
  template_id: string;
  issued_at: string;
};

type TemplateLite = { id: string; image_url: string };

export default function StudentDashboardPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const user = session?.user ?? null;

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CardCourse[]>([]);
  const [enrolledCount, setEnrolledCount] = useState(0);

  // Certificates state
  const [certsLoading, setCertsLoading] = useState(true);
  const [certs, setCerts] = useState<
    {
      id: string;
      issued_at: string;
      course: { id: string; title: string };
      previewUrl: string | null;
    }[]
  >([]);

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

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);

      // 1) Enrollments → course IDs
      const { data: enrollRows, error: enrErr } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user.id);

      if (enrErr) {
        console.error("Dashboard: enrollments error", enrErr);
        setLoading(false);
        return;
      }

      const courseIds = (enrollRows ?? []).map(
        (r: EnrollmentRow) => r.course_id
      );
      setEnrolledCount(courseIds.length);

      if (courseIds.length === 0) {
        setCards([]);
        setLoading(false);
        return;
      }

      // 2) Courses to show
      const { data: courseRows, error: courseErr } = await supabase
        .from("courses")
        .select("id, title, image_url")
        .in("id", courseIds);

      if (courseErr) {
        console.error("Dashboard: courses error", courseErr);
        setLoading(false);
        return;
      }
      const courses = (courseRows ?? []) as CourseLite[];

      // 3) Modules for these courses
      const { data: moduleRows, error: modErr } = await supabase
        .from("modules")
        .select("id, course_id")
        .in("course_id", courseIds);

      if (modErr) {
        console.error("Dashboard: modules error", modErr);
        setLoading(false);
        return;
      }
      const modules = (moduleRows ?? []) as ModuleRow[];
      const moduleIds = modules.map((m) => m.id);

      // 4) Lessons in those modules
      let lessons: LessonRow[] = [];
      if (moduleIds.length > 0) {
        const { data: lessonRows, error: lessonErr } = await supabase
          .from("lessons")
          .select("id, module_id")
          .in("module_id", moduleIds);

        if (lessonErr) {
          console.error("Dashboard: lessons error", lessonErr);
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

      // 5) Lesson completions for this user
      const { data: compRows, error: compErr } = await supabase
        .from("lesson_completions") // adjust if your table name differs
        .select("lesson_id")
        .eq("user_id", user.id);

      if (compErr) {
        console.error("Dashboard: completions error", compErr);
        setLoading(false);
        return;
      }

      const completedSet = new Set(
        (compRows ?? []).map((r: CompletionRow) => r.lesson_id)
      );

      // 6) Build card data per course
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

      // sort: in-progress first, then completed, then not-started
      const inProgress = built
        .filter(
          (b) =>
            b.totalLessons > 0 &&
            b.completedLessons < b.totalLessons &&
            b.completedLessons >= 0
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
  }, [supabase, user?.id, user]);

  // ===== Certificates fetch =====
  useEffect(() => {
    if (!user) {
      setCerts([]);
      setCertsLoading(false);
      return;
    }
    (async () => {
      setCertsLoading(true);

      // 1) Get user certificates
      const { data: certRows, error: certErr } = await supabase
        .from("certificates")
        .select("id, course_id, template_id, issued_at")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });

      if (certErr) {
        console.error("Certificates: error", certErr);
        setCerts([]);
        setCertsLoading(false);
        return;
      }

      const rows = (certRows ?? []) as CertRow[];
      if (rows.length === 0) {
        setCerts([]);
        setCertsLoading(false);
        return;
      }

      const courseIds = Array.from(new Set(rows.map((r) => r.course_id)));
      const templateIds = Array.from(new Set(rows.map((r) => r.template_id)));

      // 2) Fetch course titles
      const { data: crs, error: crsErr } = await supabase
        .from("courses")
        .select("id, title")
        .in("id", courseIds);

      if (crsErr) {
        console.error("Certificates: courses error", crsErr);
        setCerts([]);
        setCertsLoading(false);
        return;
      }

      // 3) Fetch templates (to show preview image)
      const { data: tmpls, error: tErr } = await supabase
        .from("certificate_templates")
        .select("id, image_url")
        .in("id", templateIds);

      if (tErr) {
        console.error("Certificates: templates error", tErr);
        setCerts([]);
        setCertsLoading(false);
        return;
      }

      const courseMap = new Map<string, { id: string; title: string }>();
      (crs ?? []).forEach((c) =>
        courseMap.set(c.id, { id: c.id, title: c.title })
      );

      const tmplMap = new Map<string, string | null>();
      (tmpls ?? []).forEach((t) =>
        tmplMap.set(t.id, (t as TemplateLite).image_url ?? null)
      );

      const merged = rows.map((r) => ({
        id: r.id,
        issued_at: r.issued_at,
        course: courseMap.get(r.course_id) ?? {
          id: r.course_id,
          title: "Course",
        },
        previewUrl: tmplMap.get(r.template_id) ?? null,
      }));

      setCerts(merged);
      setCertsLoading(false);
    })();
  }, [supabase, user?.id, user]);

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

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Greeting */}
      <Greeting nameOrEmail={session?.user?.email ?? "Student"} />

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
                /^https?:\/\//.test(c.image_url ?? "");

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

      {/* Your Certificates */}
      <section className="bg-white rounded-lg shadow">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Certificates</h2>
        </div>

        {certsLoading ? (
          <p className="p-6 text-gray-600">Loading certificates…</p>
        ) : certs.length === 0 ? (
          <p className="p-6 text-gray-600">
            No certificates yet. Finish a course to earn one!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
            {certs.map((c) => {
              const preview =
                typeof c.previewUrl === "string" &&
                /^https?:\/\//.test(c.previewUrl);
              return (
                <div
                  key={c.id}
                  className="border rounded-lg overflow-hidden bg-white"
                >
                  <div className="relative w-full h-40 bg-gray-100">
                    {preview && (
                      <Image
                        src={c.previewUrl!}
                        alt="Certificate template"
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                    )}
                  </div>
                  <div className="p-4 space-y-1">
                    <div className="font-medium">{c.course.title}</div>
                    <div className="text-xs text-gray-500">
                      Issued {new Date(c.issued_at).toLocaleDateString()}
                    </div>
                    <div className="pt-2">
                      <Link
                        href={`/courses/${c.course.id}/congrats`}
                        className="inline-flex items-center px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
                      >
                        View / Download
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

/* ——— small components ——— */

function Greeting({ nameOrEmail }: { nameOrEmail: string }) {
  const first =
    (nameOrEmail?.split("@")[0] ?? "Student").split(" ")[0] ?? "Student";
  const initial = first ? first[0]!.toUpperCase() : "S";
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-green-600 text-white grid place-items-center">
        {initial}
      </div>
      <div>
        <p className="text-sm text-gray-500">Hello,</p>
        <p className="text-lg font-semibold">
          {first.charAt(0).toUpperCase() + first.slice(1)}
        </p>
      </div>
    </div>
  );
}

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
