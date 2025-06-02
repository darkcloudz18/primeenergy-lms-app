// src/components/CourseForm.tsx
"use client";

import React, { useState, FormEvent, ChangeEvent } from "react";
import Image from "next/image";
import { uploadImage } from "@/lib/upload";
import RichTextEditor from "./RichTextEditor";

// Each lesson’s shape
export interface LessonInput {
  title: string;
  content: string; // HTML from Tiptap
  type: "article" | "video" | "image";
  ordering: number;
  imageUrl: string | null;
}

// What the parent form will receive on submit
export interface CourseFormData {
  title: string;
  description: string;
  imageUrl: string | null;
  category: string;
  tag: string;
  level: string;
  lessons: LessonInput[];
}

export default function CourseForm({
  onSubmit,
}: {
  onSubmit: (data: CourseFormData) => Promise<void>;
}) {
  // ─── Course metadata state ─────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [level, setLevel] = useState("");
  const [uploadingCourseImage, setUploadingCourseImage] = useState(false);

  // ─── Lessons array state ────────────────────────────────────────────
  const [lessons, setLessons] = useState<LessonInput[]>([
    { title: "", content: "", type: "article", ordering: 1, imageUrl: null },
  ]);

  // ─── Handlers for course thumbnail upload ─────────────────────────
  const handleCourseImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCourseImage(true);
    try {
      const url = await uploadImage(file);
      setThumbnailUrl(url);
    } catch (err) {
      alert("Upload failed: " + (err as Error).message);
    } finally {
      setUploadingCourseImage(false);
    }
  };

  // ─── Helpers to add/remove/update lessons ───────────────────────────
  const updateLesson = (
    idx: number,
    changes: Partial<Omit<LessonInput, "ordering">>
  ) => {
    setLessons((all) =>
      all.map((l, i) => (i === idx ? { ...l, ...changes } : l))
    );
  };

  const addLesson = () => {
    setLessons((all) => [
      ...all,
      {
        title: "",
        content: "",
        type: "article",
        ordering: all.length + 1,
        imageUrl: null,
      },
    ]);
  };

  const removeLesson = (idx: number) => {
    setLessons((all) =>
      all.filter((_, i) => i !== idx).map((l, i) => ({ ...l, ordering: i + 1 }))
    );
  };

  const handleLessonImage = async (
    e: ChangeEvent<HTMLInputElement>,
    idx: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      updateLesson(idx, { imageUrl: url });
    } catch (err) {
      alert("Lesson image upload failed: " + (err as Error).message);
    }
  };

  // ─── Form submission ────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload: CourseFormData = {
      title,
      description,
      imageUrl: thumbnailUrl,
      category,
      tag,
      level,
      lessons,
    };

    await onSubmit(payload);
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Create a New Course
      </h1>

      {/* ─── Card Container ────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-8 p-6">
          {/* ── Course Details Section ──────────────────────────────────── */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Course Details
            </h2>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label
                  htmlFor="course-title"
                  className="block text-sm font-medium text-gray-700"
                >
                  Title
                </label>
                <input
                  id="course-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="
                    mt-1 block w-full px-3 py-2 border border-gray-300
                    rounded-md shadow-sm placeholder-gray-400
                    focus:outline-none focus:ring-green-500 focus:border-green-500
                  "
                  placeholder="Enter course title"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="course-description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Description
                </label>
                <textarea
                  id="course-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="
                    mt-1 block w-full px-3 py-2 border border-gray-300
                    rounded-md shadow-sm placeholder-gray-400
                    focus:outline-none focus:ring-green-500 focus:border-green-500
                  "
                  placeholder="Short description of this course"
                />
              </div>

              {/* Thumbnail Upload */}
              <div>
                <label
                  htmlFor="course-thumbnail"
                  className="block text-sm font-medium text-gray-700"
                >
                  Course Thumbnail
                </label>
                <input
                  id="course-thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={handleCourseImageChange}
                  className="mt-1 block w-full text-gray-700"
                />
                {uploadingCourseImage && (
                  <p className="mt-1 text-sm text-gray-500">Uploading…</p>
                )}
                {thumbnailUrl && (
                  <div className="mt-3 h-40 w-full relative rounded-md overflow-hidden border border-gray-200">
                    <Image
                      src={thumbnailUrl}
                      alt="Thumbnail preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Category / Tag / Level */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="course-category"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Category
                  </label>
                  <input
                    id="course-category"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="
                      mt-1 block w-full px-3 py-2 border border-gray-300
                      rounded-md shadow-sm placeholder-gray-400
                      focus:outline-none focus:ring-green-500 focus:border-green-500
                    "
                    placeholder="e.g. Solar Energy 101"
                  />
                </div>
                <div>
                  <label
                    htmlFor="course-tag"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Tag
                  </label>
                  <input
                    id="course-tag"
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="
                      mt-1 block w-full px-3 py-2 border border-gray-300
                      rounded-md shadow-sm placeholder-gray-400
                      focus:outline-none focus:ring-green-500 focus:border-green-500
                    "
                    placeholder="e.g. Beginner"
                  />
                </div>
                <div>
                  <label
                    htmlFor="course-level"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Level
                  </label>
                  <select
                    id="course-level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="
                      mt-1 block w-full px-3 py-2 border border-gray-300
                      rounded-md shadow-sm bg-white
                      focus:outline-none focus:ring-green-500 focus:border-green-500
                    "
                  >
                    <option value="">Select level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── Lessons Section ──────────────────────────────────────────── */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Lessons
            </h2>

            <div className="space-y-6">
              {lessons.map((lesson, i) => (
                <div
                  key={i}
                  className="
                    border border-gray-200 rounded-lg p-4
                    bg-gray-50
                  "
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-700">
                      Lesson {i + 1}
                    </h3>
                    {lessons.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLesson(i)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Lesson Title */}
                    <div>
                      <label
                        htmlFor={`lesson-title-${i}`}
                        className="block text-sm font-medium text-gray-700"
                      >
                        Title
                      </label>
                      <input
                        id={`lesson-title-${i}`}
                        type="text"
                        value={lesson.title}
                        onChange={(e) =>
                          updateLesson(i, { title: e.target.value })
                        }
                        required
                        className="
                          mt-1 block w-full px-3 py-2 border border-gray-300
                          rounded-md shadow-sm placeholder-gray-400
                          focus:outline-none focus:ring-green-500 focus:border-green-500
                        "
                        placeholder="Enter lesson title"
                      />
                    </div>

                    {/* Lesson Type */}
                    <div>
                      <label
                        htmlFor={`lesson-type-${i}`}
                        className="block text-sm font-medium text-gray-700"
                      >
                        Type
                      </label>
                      <select
                        id={`lesson-type-${i}`}
                        value={lesson.type}
                        onChange={(e) =>
                          updateLesson(i, {
                            type: e.target.value as LessonInput["type"],
                          })
                        }
                        className="
                          mt-1 block w-full px-3 py-2 border border-gray-300
                          rounded-md shadow-sm bg-white
                          focus:outline-none focus:ring-green-500 focus:border-green-500
                        "
                      >
                        <option value="article">Article</option>
                        <option value="video">Video</option>
                        <option value="image">Image</option>
                      </select>
                    </div>

                    {/* Lesson Image (if type=image) */}
                    {lesson.type === "image" && (
                      <div>
                        <label
                          htmlFor={`lesson-image-${i}`}
                          className="block text-sm font-medium text-gray-700"
                        >
                          Lesson Image
                        </label>
                        <input
                          id={`lesson-image-${i}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLessonImage(e, i)}
                          className="
                            mt-1 block w-full text-gray-700
                          "
                        />
                        {lesson.imageUrl && (
                          <div className="mt-3 h-32 w-full relative rounded-md overflow-hidden border border-gray-200">
                            <Image
                              src={lesson.imageUrl}
                              alt="Lesson preview"
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Lesson Content (Rich Text) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Content
                      </label>
                      <RichTextEditor
                        value={lesson.content}
                        onChange={(html) => updateLesson(i, { content: html })}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addLesson}
                className="
                  inline-flex items-center px-4 py-2 bg-green-600 text-white
                  rounded-md hover:bg-green-700 focus:outline-none focus:ring-2
                  focus:ring-offset-2 focus:ring-green-500
                "
              >
                + Add Another Lesson
              </button>
            </div>
          </div>

          {/* ── Final Submit Button ────────────────────────────────────── */}
          <div>
            <button
              type="submit"
              disabled={saving || uploadingCourseImage}
              className="
                w-full flex justify-center py-3 px-6 bg-green-600 text-white
                font-medium rounded-md hover:bg-green-700 focus:outline-none
                focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                disabled:opacity-50
              "
            >
              {saving ? "Saving…" : "Create Course & Lessons"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
