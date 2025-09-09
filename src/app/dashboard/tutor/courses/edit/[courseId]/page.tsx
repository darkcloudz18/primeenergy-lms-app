export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "default-no-store";

import React from "react";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Course, Module, Lesson, QuizEntity } from "@/lib/types";
import CourseImageUpload from "@/components/CourseImageUpload";

interface PageProps {
  params: { courseId: string };
}

export default async function TutorEditCoursePage({ params }: PageProps) {
  const { courseId } = params;

  // ─── Course ─────────────────────────────────────────
  const courseRes = await supabaseAdmin
    .from("courses")
    .select(
      "id, title, description, category, level, tag, image_url, created_at, archived, instructor_id"
    )
    .eq("id", courseId)
    .single();

  if (courseRes.error || !courseRes.data) {
    return (
      <div className="p-6">
        <p className="text-red-600">
          Error loading course: {courseRes.error?.message || "Not found"}
        </p>
      </div>
    );
  }
  const course = courseRes.data as Course;

  // ─── Modules ────────────────────────────────────────
  const modsRes = await supabaseAdmin
    .from("modules")
    .select("id, course_id, title, ordering, created_at")
    .eq("course_id", courseId)
    .order("ordering", { ascending: true });
  const modules = (modsRes.data || []) as Module[];

  // ─── Lessons ────────────────────────────────────────
  const modIds = modules.map((m) => m.id);
  const lesRes = await supabaseAdmin
    .from("lessons")
    .select("id, module_id, title, ordering, created_at")
    .in("module_id", modIds.length ? modIds : ["_none_"])
    .order("ordering", { ascending: true });
  const lessons = (lesRes.data || []) as Lesson[];

  // ─── Module quizzes ─────────────────────────────────
  const qRes = await supabaseAdmin
    .from("quizzes")
    .select("id, module_id, title")
    .in("module_id", modIds.length ? modIds : ["_none_"]);
  const moduleQuizzes = (qRes.data || []) as QuizEntity[];

  // ─── Final quiz ─────────────────────────────────────
  const finalRes = await supabaseAdmin
    .from("quizzes")
    .select("id, title")
    .eq("course_id", courseId)
    .is("module_id", null)
    .maybeSingle();
  const finalQuiz = (finalRes.data || null) as QuizEntity | null;

  // after save, stay on the tutor edit route (not admin)
  const redirectTo = `/dashboard/tutor/courses/edit/${courseId}`;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8 bg-gray-50">
      <h1 className="text-3xl font-semibold">Edit Course</h1>

      {/* Course form (same server endpoint used by admin; redirect_to keeps tutors in their area) */}
      <form
        action="/api/courses/update"
        method="POST"
        className="bg-white p-6 rounded-lg shadow space-y-4"
      >
        <input type="hidden" name="id" value={course.id} />
        <input type="hidden" name="redirect_to" value={redirectTo} />

        <div>
          <label className="block font-medium mb-1">Title</label>
          <input
            name="title"
            defaultValue={course.title}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Description</label>
          <textarea
            name="description"
            defaultValue={course.description || ""}
            rows={4}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(
            ["category", "level", "tag"] as Array<"category" | "level" | "tag">
          ).map((field) => (
            <div key={field}>
              <label className="block font-medium mb-1 capitalize">
                {field}
              </label>
              <input
                name={field}
                // `course[field]` is string | null → normalize to string
                defaultValue={course[field] ?? ""}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          ))}
        </div>

        <CourseImageUpload
          courseId={course.id}
          defaultUrl={course.image_url ?? ""}
          inputName="image_url"
          label="Course image"
          bucket="course-images"
        />

        {/* No admin-only controls here (archive/owner change) */}

        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Save Course
        </button>
      </form>

      {/* Modules & Content */}
      <section className="bg-white p-6 rounded-lg shadow space-y-6">
        {/* Final Quiz */}
        <div className="border-b pb-4">
          <h2 className="text-2xl font-semibold">Final Quiz</h2>
          {finalQuiz ? (
            <Link
              href={`/dashboard/tutor/courses/edit/${courseId}/final-quiz/${finalQuiz.id}`}
              className="text-blue-600 hover:underline text-sm"
            >
              Edit Final Quiz
            </Link>
          ) : (
            <Link
              href={`/dashboard/tutor/courses/edit/${courseId}/final-quiz/new`}
              className="text-green-600 hover:underline text-sm"
            >
              + Add Final Quiz
            </Link>
          )}
        </div>

        {/* Modules */}
        {modules.map((mod) => {
          const modLessons = lessons.filter((l) => l.module_id === mod.id);
          const modQuiz = moduleQuizzes.find((q) => q.module_id === mod.id);

          return (
            <div key={mod.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  Module {mod.ordering}: {mod.title}
                </h3>
                <Link
                  href={`/dashboard/tutor/courses/edit/${courseId}/modules/${mod.id}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Edit Module
                </Link>
              </div>

              {/* Lessons */}
              <ul className="pl-4 list-disc space-y-1">
                {modLessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={`/dashboard/tutor/courses/edit/${courseId}/modules/${mod.id}/lessons/${lesson.id}`}
                      className="text-gray-800 hover:text-blue-600"
                    >
                      {lesson.ordering}. {lesson.title}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href={`/dashboard/tutor/courses/edit/${courseId}/modules/${mod.id}/lessons/new`}
                    className="text-green-600 hover:underline text-sm"
                  >
                    + Add Lesson
                  </Link>
                </li>
              </ul>

              {/* Module Quiz */}
              <div>
                {modQuiz ? (
                  <Link
                    href={`/dashboard/tutor/courses/edit/${courseId}/modules/${mod.id}/quiz/${modQuiz.id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Edit Module Quiz
                  </Link>
                ) : (
                  <Link
                    href={`/dashboard/tutor/courses/edit/${courseId}/modules/${mod.id}/quiz/new`}
                    className="text-green-600 hover:underline text-sm"
                  >
                    + Add Module Quiz
                  </Link>
                )}
              </div>

              <hr className="my-4" />
            </div>
          );
        })}

        {/* Add Module */}
        <div>
          <Link
            href={`/dashboard/tutor/courses/edit/${courseId}/modules/new`}
            className="text-green-600 hover:underline text-sm"
          >
            + Add Module
          </Link>
        </div>
      </section>
    </main>
  );
}
