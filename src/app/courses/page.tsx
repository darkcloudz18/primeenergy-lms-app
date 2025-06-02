"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

interface Course {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  level: string | null;
  tag: string | null;
  created_at: string;
}

export default function AllCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterTitle, setFilterTitle] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | "">("");
  const [filterLevel, setFilterLevel] = useState<string | "">("");
  const [filterTag, setFilterTag] = useState<string | "">("");

  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allLevels, setAllLevels] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    async function fetchCourses() {
      const { data, error } = await supabase
        .from<"courses", Course>("courses")
        .select(
          "id, title, description, image_url, category, level, tag, created_at"
        );

      if (error) {
        console.error("Error fetching courses:", error.message);
        setLoading(false);
        return;
      }
      if (data) {
        setCourses(data);

        // build unique filter dropdowns
        const cats = new Set<string>();
        const levs = new Set<string>();
        const tgs = new Set<string>();
        data.forEach((c) => {
          if (c.category) cats.add(c.category);
          if (c.level) levs.add(c.level);
          if (c.tag) tgs.add(c.tag);
        });
        setAllCategories(Array.from(cats).sort());
        setAllLevels(Array.from(levs).sort());
        setAllTags(Array.from(tgs).sort());
      }
      setLoading(false);
    }
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter((course) => {
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

  if (loading) {
    return <p className="p-6 text-center text-gray-600">Loading courses…</p>;
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8 bg-gray-50">
      <h1 className="text-3xl font-semibold">All Courses</h1>

      {/* ─── Filter Bar ─────────────────────────────────── */}
      <section className="bg-white shadow rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-medium">Filter Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Title Filter */}
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
          {/* Category Filter */}
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
          {/* Level Filter */}
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
          {/* Tag Filter */}
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

      {/* ─── Course Grid ────────────────────────────────── */}
      {filteredCourses.length === 0 ? (
        <p className="text-center text-gray-600">
          No courses match those filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            // only render if image_url is a proper https:// URL
            const hasValidImage =
              typeof course.image_url === "string" &&
              /^https?:\/\//.test(course.image_url);

            return (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group block bg-white rounded-lg shadow hover:shadow-lg transition"
              >
                {/* Thumbnail */}
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

                {/* Card Body */}
                <div className="p-4 space-y-2">
                  <h2 className="text-xl font-medium group-hover:text-green-600 transition">
                    {course.title}
                  </h2>

                  {/* Category / Level / Tag */}
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
