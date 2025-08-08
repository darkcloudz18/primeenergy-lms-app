"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

type CourseRow = { id: string; title: string };
type EnrollmentRow = { user_id: string; course_id: string; created_at: string };
type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
};
type EnrollmentView = {
  user_id: string;
  name: string;
  email: string;
  course_id: string;
  course_title: string;
  enrolled_at: string;
};

export default function TutorEnrolledStudentsPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const user = session?.user ?? null;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<EnrollmentView[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);

  // filters
  const [q, setQ] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("");

  useEffect(() => {
    if (!user?.id) {
      setRows([]);
      setCourses([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);

      // 1) Courses taught by this tutor
      const { data: myCourses, error: courseErr } = await supabase
        .from("courses")
        .select("id, title")
        .eq("instructor_id", user.id)
        .order("title", { ascending: true });

      if (courseErr) {
        console.error("Tutor Students: courses error", courseErr);
        setRows([]);
        setCourses([]);
        setLoading(false);
        return;
      }

      const courseList = (myCourses ?? []) as CourseRow[];
      setCourses(courseList);

      const courseIds = courseList.map((c) => c.id);
      if (courseIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // 2) Enrollments for those courses
      const { data: enr, error: enrErr } = await supabase
        .from("enrollments")
        .select("user_id, course_id, created_at")
        .in("course_id", courseIds)
        .order("created_at", { ascending: false });

      if (enrErr) {
        console.error("Tutor Students: enrollments error", enrErr);
        setRows([]);
        setLoading(false);
        return;
      }

      const enrollments = (enr ?? []) as EnrollmentRow[];
      if (enrollments.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // 3) Profiles for those user_ids
      const userIds = Array.from(new Set(enrollments.map((e) => e.user_id)));
      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", userIds);

      if (profErr) {
        console.error("Tutor Students: profiles error", profErr);
        setRows([]);
        setLoading(false);
        return;
      }

      const profileById = new Map(
        (profs ?? []).map((p) => [p.id, p as ProfileRow])
      );
      const courseById = new Map(courseList.map((c) => [c.id, c.title]));

      // 4) Build view rows (one per enrollment)
      const built: EnrollmentView[] = enrollments.map((e) => {
        const p = profileById.get(e.user_id);
        const name = [p?.first_name, p?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        return {
          user_id: e.user_id,
          name: name || p?.email || "Student",
          email: p?.email || "",
          course_id: e.course_id,
          course_title: courseById.get(e.course_id) || "—",
          enrolled_at: e.created_at,
        };
      });

      setRows(built);
      setLoading(false);
    })();
  }, [supabase, user?.id, user]);

  // Stats
  const totalEnrollments = rows.length;
  const totalUniqueStudents = useMemo(
    () => new Set(rows.map((r) => r.user_id)).size,
    [rows]
  );

  // Filtered rows
  const filtered = rows.filter((r) => {
    if (courseFilter && r.course_id !== courseFilter) return false;
    if (q) {
      const needle = q.toLowerCase();
      const hay = `${r.name} ${r.email} ${r.course_title}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  if (!user) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">Enrolled Students</h1>
        <p className="mt-4 text-gray-600">Please sign in as a tutor.</p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Enrolled Students</h1>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Total Enrollments" value={totalEnrollments} />
        <Stat label="Unique Students" value={totalUniqueStudents} />
        <Stat label="Your Courses" value={courses.length} />
      </section>

      {/* Filters */}
      <section className="bg-white rounded-lg shadow p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Search
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, email, course…"
            className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Course
          </label>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
          >
            <option value="">All your courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => {
              setQ("");
              setCourseFilter("");
            }}
            className="h-10 px-3 rounded bg-gray-100 hover:bg-gray-200 text-sm"
          >
            Reset
          </button>
        </div>
      </section>

      {/* Table */}
      <section className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-5 py-3 border-b text-sm text-gray-600">
          Showing {filtered.length}{" "}
          {filtered.length === 1 ? "record" : "records"}
        </div>
        {loading ? (
          <p className="p-6 text-gray-600">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-gray-600">No enrollments found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <Th>Student</Th>
                  <Th>Email</Th>
                  <Th>Course</Th>
                  <Th>Enrolled</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={`${r.user_id}-${r.course_id}-${r.enrolled_at}`}
                    className="border-b"
                  >
                    <Td>{r.name}</Td>
                    <Td>{r.email}</Td>
                    <Td>{r.course_title}</Td>
                    <Td>{new Date(r.enrolled_at).toLocaleString()}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left font-medium px-4 py-2 text-gray-700">
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2">{children}</td>;
}
