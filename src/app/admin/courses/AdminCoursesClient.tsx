// src/app/admin/courses/AdminCoursesClient.tsx
"use client";

import { useMemo, useState } from "react";
import AdminCourseCard from "@/components/admin/CourseCard";
import type { Course } from "@/lib/types";

interface Props {
  initialCourses: Course[];
}

export default function AdminCoursesClient({ initialCourses }: Props) {
  // Keep a local copy so we can filter in the client
  const [courses] = useState<Course[]>(initialCourses ?? []);

  // ── Filters
  const [filterTitle, setFilterTitle] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterTag, setFilterTag] = useState("");

  // Build dropdown options (skip nulls)
  const allCategories = useMemo(() => {
    const s = new Set<string>();
    courses.forEach((c) => {
      if (
        c.category !== null &&
        c.category !== undefined &&
        c.category !== ""
      ) {
        s.add(c.category);
      }
    });
    return Array.from(s).sort();
  }, [courses]);

  const allLevels = useMemo(() => {
    const s = new Set<string>();
    courses.forEach((c) => {
      if (c.level !== null && c.level !== undefined && c.level !== "") {
        s.add(c.level);
      }
    });
    return Array.from(s).sort();
  }, [courses]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    courses.forEach((c) => {
      if (c.tag !== null && c.tag !== undefined && c.tag !== "") {
        s.add(c.tag);
      }
    });
    return Array.from(s).sort();
  }, [courses]);

  // Apply filters
  const visible = useMemo(() => {
    return courses.filter((c) => {
      if (
        filterTitle &&
        !c.title.toLowerCase().includes(filterTitle.toLowerCase())
      ) {
        return false;
      }
      if (filterCategory && c.category !== filterCategory) return false;
      if (filterLevel && c.level !== filterLevel) return false;
      if (filterTag && c.tag !== filterTag) return false;
      return true;
    });
  }, [courses, filterTitle, filterCategory, filterLevel, filterTag]);

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8 bg-gray-50">
      <h1 className="text-3xl font-semibold">Manage Courses</h1>

      {/* Filter Bar */}
      <section className="bg-white shadow rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-medium">Filter Courses</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              value={filterTitle}
              onChange={(e) => setFilterTitle(e.target.value)}
              placeholder="Search by title…"
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
            >
              <option value="">All Categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Level
            </label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
            >
              <option value="">All Levels</option>
              {allLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Tag */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tag
            </label>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
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

      {/* Course Grid */}
      {visible.length === 0 ? (
        <p className="text-center text-gray-600">
          No courses match those filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((c) => (
            <AdminCourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </main>
  );
}
