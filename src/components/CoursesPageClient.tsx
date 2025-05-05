// src/components/CoursesPageClient.tsx
"use client";

import { useState, useMemo } from "react";
import CourseCard from "./CourseCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faChevronDown } from "@fortawesome/free-solid-svg-icons";

export interface Course {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category?: string;
  level?: string;
}

interface Props {
  initialCourses: Course[];
  categories: string[];
  levels: string[];
}

export default function CoursesPageClient({
  initialCourses,
  categories,
  levels,
}: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const filtered = useMemo(() => {
    let items = initialCourses;

    // search filter
    if (search) {
      items = items.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase())
      );
    }
    // category filter
    if (category) {
      items = items.filter((c) => c.category === category);
    }
    // level filter
    if (level) {
      items = items.filter((c) => c.level === level);
    }
    // sort
    if (sortOrder === "oldest") {
      items = [...items].reverse();
    }
    return items;
  }, [initialCourses, search, category, level, sortOrder]);

  return (
    <div className="flex max-w-7xl mx-auto px-6 py-12 gap-8">
      {/* Sidebar */}
      <aside className="w-64 space-y-6">
        {/* Search */}
        <div className="relative">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="      Search courses"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 bg-white rounded px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        {/* Category */}
        <div>
          <h3 className="text-gray-800 font-semibold mb-2">Category</h3>
          {categories.map((cat) => (
            <label key={cat} className="flex items-center space-x-2 mb-1">
              <input
                type="radio"
                name="category"
                value={cat}
                checked={category === cat}
                onChange={() => setCategory(cat)}
                className="accent-green-600"
              />
              <span className="text-gray-900">{cat}</span>
            </label>
          ))}
          <button
            onClick={() => setCategory(null)}
            className="mt-1 text-sm text-green-600 hover:underline"
          >
            Clear Category
          </button>
        </div>

        {/* Level */}
        <div>
          <h3 className="text-gray-800 font-semibold mb-2">Level</h3>
          {levels.map((lvl) => (
            <label key={lvl} className="flex items-center space-x-2 mb-1">
              <input
                type="radio"
                name="level"
                value={lvl}
                checked={level === lvl}
                onChange={() => setLevel(lvl)}
                className="accent-green-600"
              />
              <span className="text-gray-900">{lvl}</span>
            </label>
          ))}
          <button
            onClick={() => setLevel(null)}
            className="mt-1 text-sm text-green-600 hover:underline"
          >
            Clear Level
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <section className="flex-1 space-y-6">
        {/* Sort Dropdown */}
        <div className="flex justify-end">
          <div className="relative inline-block w-48">
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as "newest" | "oldest")
              }
              className="
        block
        w-full
        border border-gray-300
        bg-white
        text-gray-800
        text-base
        font-medium
        rounded
        px-4 py-2 pr-10
        focus:outline-none focus:ring-2 focus:ring-green-400
        appearance-none
      "
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>

            {/* Chevron icon */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <FontAwesomeIcon icon={faChevronDown} className="text-gray-500" />
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        {filtered.length === 0 ? (
          <p className="text-center text-gray-600">No courses found.</p>
        ) : (
          <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <CourseCard
                key={c.id}
                id={c.id}
                title={c.title}
                imageUrl={c.image_url || "/placeholder.png"}
                description={c.description || ""}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
