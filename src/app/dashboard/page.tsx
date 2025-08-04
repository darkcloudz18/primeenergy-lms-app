// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Course } from "@/lib/types";
import Image from "next/image";

export default function StudentDashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(
          "id, title, description, image_url, category, level, tag, archived, instructor_id, created_at"
        )
        .eq("archived", false);

      if (error) {
        console.error("Error fetching courses:", error.message);
      } else if (Array.isArray(data)) {
        setCourses(data);
      }

      setLoading(false);
    };

    fetchCourses();
  }, []);

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">My Courses</h1>

      {loading ? (
        <p>Loading...</p>
      ) : courses.length === 0 ? (
        <p className="text-gray-500">No courses found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition"
            >
              <Image
                src={course.image_url || "/default-course.jpg"}
                alt={course.title}
                width={400}
                height={160}
                className="w-full h-40 object-cover rounded"
              />
              <div className="mt-3">
                <h2 className="text-xl font-semibold">{course.title}</h2>
                <p className="text-gray-600 text-sm line-clamp-2">
                  {course.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
