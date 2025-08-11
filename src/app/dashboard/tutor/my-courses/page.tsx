// src/app/dashboard/tutor/my-courses/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";

type Course = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  level: string | null;
  tag: string | null;
  created_at: string;
  instructor_id: string | null;
  archived?: boolean | null;
};

type ArchiveApiResponse = { ok?: true; error?: string };

export default function TutorMyCoursesPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const user = session?.user ?? null;

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});

  // Filters
  const [filterTitle, setFilterTitle] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | "">("");
  const [filterLevel, setFilterLevel] = useState<string | "">("");
  const [filterTag, setFilterTag] = useState<string | "">("");

  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allLevels, setAllLevels] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    let canceled = false;

    async function run() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);

      const { data, error } = await supabase
        .from("courses")
        .select(
          "id, title, description, image_url, category, level, tag, created_at, instructor_id, archived"
        )
        .eq("instructor_id", user.id)
        .order("created_at", { ascending: false });

      if (canceled) return;

      if (error) {
        console.error("MyCourses: fetch error", error);
        setCourses([]);
      } else {
        const rows = (data ?? []) as Course[];
        setCourses(rows);

        // Build filter option sets
        const cats = new Set<string>();
        const levs = new Set<string>();
        const tgs = new Set<string>();
        rows.forEach((c) => {
          if (c.category) cats.add(c.category);
          if (c.level) levs.add(c.level);
          if (c.tag) tgs.add(c.tag);
        });
        setAllCategories([...cats].sort());
        setAllLevels([...levs].sort());
        setAllTags([...tgs].sort());
      }

      setLoading(false);
    }

    run();
    return () => {
      canceled = true;
    };
  }, [supabase, user?.id, user]);

  const filtered = useMemo(() => {
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

  const setBusy = (id: string, v: boolean) =>
    setBusyIds((prev) => ({ ...prev, [id]: v }));

  // Actions
  const doArchive = async (id: string) => {
    setBusy(id, true);
    try {
      const res = await fetch("/api/admin/archive-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ courseId: id }),
      });
      const json = (await res.json()) as ArchiveApiResponse;
      if (!res.ok || json.error)
        throw new Error(json.error || "Archive failed");
      setCourses((prev) =>
        prev.map((c) => (c.id === id ? { ...c, archived: true } : c))
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(id, false);
    }
  };

  const doUnarchive = async (id: string) => {
    setBusy(id, true);
    try {
      const res = await fetch("/api/admin/unarchive-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ courseId: id }),
      });
      const json = (await res.json()) as ArchiveApiResponse;
      if (!res.ok || json.error)
        throw new Error(json.error || "Unarchive failed");
      setCourses((prev) =>
        prev.map((c) => (c.id === id ? { ...c, archived: false } : c))
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(id, false);
    }
  };

  const doDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(id, true);
    try {
      const res = await fetch("/api/admin/delete-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ courseId: id }),
      });
      const json = (await res.json()) as ArchiveApiResponse;
      if (!res.ok || json.error) throw new Error(json.error || "Delete failed");
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(id, false);
    }
  };

  if (!user) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">My Courses</h1>
        <p className="mt-4 text-gray-600">
          Please sign in to see your courses.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">My Courses</h1>

      {/* Filters */}
      <section className="bg-white shadow rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-medium">Filter</h2>
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
      {loading ? (
        <p className="text-center text-gray-600">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-600">
          You haven’t created any courses yet.
        </p>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => {
            const hasValidImage =
              typeof course.image_url === "string" &&
              /^https?:\/\//.test(course.image_url);

            const isBusy = !!busyIds[course.id];
            const isArchived = !!course.archived;

            return (
              <div
                key={course.id}
                className={`group bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden ${
                  isArchived ? "opacity-60" : ""
                }`}
              >
                {hasValidImage && (
                  <div className="relative w-full h-40">
                    <Image
                      src={course.image_url!}
                      alt={course.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  </div>
                )}

                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/courses/${course.id}`}
                      className="text-lg font-semibold hover:text-green-700"
                    >
                      {course.title}
                    </Link>
                    <span className="text-xs text-gray-500">
                      {new Date(course.created_at).toLocaleDateString()}
                    </span>
                  </div>

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
                    <p className="text-gray-700 line-clamp-2">
                      {course.description}
                    </p>
                  )}

                  <div className="pt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/admin/courses/edit/${course.id}`}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Edit
                    </Link>

                    {!isArchived ? (
                      <button
                        disabled={isBusy}
                        onClick={() => doArchive(course.id)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                      >
                        {isBusy ? "…" : "Archive"}
                      </button>
                    ) : (
                      <button
                        disabled={isBusy}
                        onClick={() => doUnarchive(course.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {isBusy ? "…" : "Unarchive"}
                      </button>
                    )}

                    <button
                      disabled={isBusy}
                      onClick={() => doDelete(course.id, course.title)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
