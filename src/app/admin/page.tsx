"use client";

import { useEffect, useMemo, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import {
  AcademicCapIcon,
  UserGroupIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

type Course = {
  id: string;
  archived: boolean | null;
};

export default function AdminHomePage() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [usersCount, setUsersCount] = useState<number>(0);
  const [enrollmentsCount, setEnrollmentsCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // courses
      const { data: courseRows } = await supabase
        .from("courses")
        .select("id, archived", { count: "exact" });
      setCourses(courseRows ?? []);

      // users (profiles)
      const { count: usersCnt } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      setUsersCount(usersCnt ?? 0);

      // enrollments
      const { count: enrollCnt } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true });
      setEnrollmentsCount(enrollCnt ?? 0);

      setLoading(false);
    })();
  }, [supabase]);

  const activeCourses = useMemo(
    () => courses.filter((c) => !c.archived).length,
    [courses]
  );

  if (loading) {
    return <p className="text-center text-gray-600">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<AcademicCapIcon className="w-6 h-6 text-green-700" />}
          label="Total Courses"
          value={courses.length}
        />
        <StatCard
          icon={<AcademicCapIcon className="w-6 h-6 text-green-700" />}
          label="Active Courses"
          value={activeCourses}
        />
        <StatCard
          icon={<UserGroupIcon className="w-6 h-6 text-green-700" />}
          label="Total Users"
          value={usersCount}
        />
        <StatCard
          icon={<CheckBadgeIcon className="w-6 h-6 text-green-700" />}
          label="Enrollments"
          value={enrollmentsCount}
        />
      </section>
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
