"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import Link from "next/link";
import Image from "next/image";

type Course = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  level: string | null;
  tag: string | null;
  created_at: string;
};

export default function EnrolledCoursesPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const userId = session?.user?.id ?? null;

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // filters (to match your “All Courses” UI)
  const [filterTitle, setFilterTitle] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | "">("");
  const [filterLevel, setFilterLevel] = useState<string | "">("");
  const [filterTag, setFilterTag] = useState<string | "">("");

  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allLevels, setAllLevels] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchEnrolledCourses = async () => {
      setLoading(true);

      if (!userId) {
        console.log("🔒 No user; not fetching enrolled courses.");
        if (!cancelled) {
          setCourses([]);
          setLoading(false);
        }
        return;
      }

      // 1) get enrolled course IDs
      const { data: enrollRows, error: enrollErr } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", userId);

      if (enrollErr) {
        console.error("❌ enrollments query failed:", enrollErr);
        if (!cancelled) {
          setCourses([]);
          setLoading(false);
        }
        return;
      }

      const courseIds = Array.from(
        new Set(
          (enrollRows ?? [])
            .map((r) => (r as { course_id: string | null }).course_id)
            .filter((id): id is string => !!id)
        )
      );

      console.log("🎓 Enrolled course IDs:", courseIds);

      if (courseIds.length === 0) {
        if (!cancelled) {
          setCourses([]);
          setAllCategories([]);
          setAllLevels([]);
          setAllTags([]);
          setLoading(false);
        }
        return;
      }

      // 2) Try a batched fetch
      const { data: batch, error: batchErr } = await supabase
        .from("courses")
        .select(
          "id, title, description, image_url, category, level, tag, created_at"
        )
        .in("id", courseIds)
        .order("created_at", { ascending: false });

      if (batchErr) {
        console.error("❌ courses (batched) failed:", batchErr);
      }
      console.log("📦 Courses fetched by IDs (batched):", batch);

      let list: Course[] = (batch ?? []) as Course[];

      // 3) If batched returns 0 (your current case), fall back to per-ID fetches
      if (!batch || batch.length === 0) {
        console.warn(
          "⚠️ Batched IN() returned no rows. Falling back to per-ID queries."
        );
        const perIdResults: Course[] = [];

        for (const id of courseIds) {
          const { data: one, error: oneErr } = await supabase
            .from("courses")
            .select(
              "id, title, description, image_url, category, level, tag, created_at"
            )
            .eq("id", id)
            .maybeSingle();

          console.log("🔎 Single ID lookup", id, { one, oneErr });
          if (!oneErr && one) perIdResults.push(one as Course);
        }

        list = perIdResults;
      }

      // build dropdown options
      const cats = new Set<string>();
      const levs = new Set<string>();
      const tgs = new Set<string>();
      for (const c of list) {
        if (c.category) cats.add(c.category);
        if (c.level) levs.add(c.level);
        if (c.tag) tgs.add(c.tag);
      }

      if (!cancelled) {
        setCourses(list);
        setAllCategories(Array.from(cats).sort());
        setAllLevels(Array.from(levs).sort());
        setAllTags(Array.from(tgs).sort());
        setLoading(false);
      }
    };

    fetchEnrolledCourses();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      if (
        filterTitle &&
        !course.title.toLowerCase().includes(filterTitle.toLowerCase())
      )
        return false;
      if (filterCategory && course.category !== filterCategory) return false;
      if (filterLevel && course.level !== filterLevel) return false;
      if (filterTag && course.tag !== filterTag) return false;
      return true;
    });
  }, [courses, filterTitle, filterCategory, filterLevel, filterTag]);

  if (!userId) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-semibold mb-4">My Enrolled Courses</h1>
        <p className="text-gray-600">Please sign in to view your courses.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-semibold mb-4">My Enrolled Courses</h1>
        <p className="text-gray-600">Loading…</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8 bg-gray-50">
      <h1 className="text-3xl font-semibold">My Enrolled Courses</h1>

      {/* Filter Bar */}
      <section className="bg-white shadow rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-medium">Filter Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              value={filterTitle}
              onChange={(e) => setFilterTitle(e.target.value)}
              placeholder="Search by title…"
              className="mt-1 w-full border-gray-300 rounded px-3 py-2 border focus:outline-none focus:ring focus:ring-green-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="mt-1 w-full border-gray-300 rounded px-3 py-2 border focus:outline-none focus:ring focus:ring-green-200"
            >
              <option value="">All Categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Level
            </label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="mt-1 w-full border-gray-300 rounded px-3 py-2 border focus:outline-none focus:ring focus:ring-green-200"
            >
              <option value="">All Levels</option>
              {allLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tag
            </label>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="mt-1 w-full border-gray-300 rounded px-3 py-2 border focus:outline-none focus:ring focus:ring-green-200"
            >
              <option value="">All Tags</option>
              {allTags.map((tg) => (
                <option key={tg} value={tg}>
                  {tg}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Grid */}
      {filteredCourses.length === 0 ? (
        <p className="text-center text-gray-600">
          You’re not enrolled in any courses (or none match the filters).
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const hasValidImage =
              typeof course.image_url === "string" &&
              /^https?:\/\//.test(course.image_url);

            return (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group block bg-white rounded-lg shadow hover:shadow-lg transition"
              >
                {hasValidImage && (
                  <div className="relative w-full h-48">
                    <Image
                      src={course.image_url!}
                      alt={`Thumbnail for ${course.title}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <h2 className="text-xl font-medium group-hover:text-green-600 transition">
                    {course.title}
                  </h2>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {course.category && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                        {course.category}
                      </span>
                    )}
                    {course.level && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {course.level}
                      </span>
                    )}
                    {course.tag && (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        {course.tag}
                      </span>
                    )}
                  </div>
                  {course.description && (
                    <p className="mt-2 text-gray-700 line-clamp-2">
                      {course.description}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
