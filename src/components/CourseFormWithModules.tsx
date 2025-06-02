// src/components/CourseFormWithModules.tsx
"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import QuizForm, { QuizFormData } from "@/components/QuizForm";
import type { LessonInput } from "@/lib/types";

//
// ── Types for Form Data ──────────────────────────────────────────────────────
//

// Each lesson in the form:
export interface LessonFormData {
  title: string;
  content: string;
  type: "article" | "video" | "image";
  ordering: number;
  imageUrl: string;
}

// Each module in the form (lessons + optional quiz):
export interface ModuleFormData {
  title: string;
  ordering: number;
  lessons: LessonFormData[];
  quiz: QuizFormData | null;
}

// Props for this CourseFormWithModules component:
export interface CourseFormWithModulesProps {
  onSubmit: (data: {
    title: string;
    description: string;
    coverFile: File | null;
    category: string;
    level: string;
    tag: string;
    modules: ModuleFormData[];
    finalQuiz: QuizFormData | null;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function CourseFormWithModules({
  onSubmit,
  onCancel,
}: CourseFormWithModulesProps) {
  //
  // ─── Course‐Level State ─────────────────────────────────────────────────────
  //
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [tag, setTag] = useState<string>("");

  //
  // ─── Modules + Lessons + Quiz State ─────────────────────────────────────────
  //
  const [modules, setModules] = useState<ModuleFormData[]>([
    { title: "", ordering: 1, lessons: [], quiz: null },
  ]);

  //
  // ─── Final Quiz State (optional) ────────────────────────────────────────────
  //
  const [finalQuiz, setFinalQuiz] = useState<QuizFormData | null>(null);

  //
  // ─── Helper: Update a module’s field ────────────────────────────────────────
  //
  function updateModuleField<K extends keyof ModuleFormData>(
    moduleIndex: number,
    field: K,
    value: ModuleFormData[K]
  ) {
    setModules((prev) =>
      prev.map((mod, idx) =>
        idx === moduleIndex ? { ...mod, [field]: value } : mod
      )
    );
  }

  //
  // ─── Module CRUD ───────────────────────────────────────────────────────────
  //
  function addModule() {
    setModules((prev) => [
      ...prev,
      { title: "", ordering: prev.length + 1, lessons: [], quiz: null },
    ]);
  }
  function removeModule(moduleIndex: number) {
    setModules((prev) => prev.filter((_, idx) => idx !== moduleIndex));
  }

  //
  // ─── Lesson CRUD Within a Module ───────────────────────────────────────────
  //
  function addLesson(moduleIndex: number) {
    setModules((prev) =>
      prev.map((mod, idx) => {
        if (idx !== moduleIndex) return mod;
        const nextOrdering = mod.lessons.length + 1;
        return {
          ...mod,
          lessons: [
            ...mod.lessons,
            {
              title: "",
              content: "",
              type: "article",
              ordering: nextOrdering,
              imageUrl: "",
            },
          ],
        };
      })
    );
  }
  function removeLesson(moduleIndex: number, lessonIndex: number) {
    setModules((prev) =>
      prev.map((mod, idx) => {
        if (idx !== moduleIndex) return mod;
        return {
          ...mod,
          lessons: mod.lessons
            .filter((_, lIdx) => lIdx !== lessonIndex)
            .map((l, newIdx) => ({
              ...l,
              ordering: newIdx + 1,
            })),
        };
      })
    );
  }
  function updateLessonField<K extends keyof LessonFormData>(
    moduleIndex: number,
    lessonIndex: number,
    field: K,
    value: LessonFormData[K]
  ) {
    setModules((prev) =>
      prev.map((mod, idx) => {
        if (idx !== moduleIndex) return mod;
        const updatedLessons = mod.lessons.map((lesson, lIdx) =>
          lIdx === lessonIndex ? { ...lesson, [field]: value } : lesson
        );
        return { ...mod, lessons: updatedLessons };
      })
    );
  }

  //
  // ─── Module‐Level Quiz Helpers ──────────────────────────────────────────────
  //
  function addQuizToModule(moduleIndex: number) {
    const blankQuiz: QuizFormData = {
      title: "",
      description: "",
      passing_score: 0,
      questions: [],
    };
    updateModuleField(moduleIndex, "quiz", blankQuiz);
  }
  function removeQuizFromModule(moduleIndex: number) {
    updateModuleField(moduleIndex, "quiz", null);
  }
  function saveModuleQuiz(moduleIndex: number, quizData: QuizFormData) {
    updateModuleField(moduleIndex, "quiz", quizData);
  }

  //
  // ─── Final Quiz Helpers ───────────────────────────────────────────────────
  //
  function addFinalQuiz() {
    setFinalQuiz({
      title: "",
      description: "",
      passing_score: 0,
      questions: [],
    });
  }
  function removeFinalQuiz() {
    setFinalQuiz(null);
  }
  function saveFinalQuiz(quizData: QuizFormData) {
    setFinalQuiz(quizData);
  }

  //
  // ─── Handle Cover File Change ───────────────────────────────────────────────
  //
  function handleCoverFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setCoverFile(file);
  }

  //
  // ─── Form Submission ───────────────────────────────────────────────────────
  //
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onSubmit({
      title,
      description,
      coverFile,
      category,
      level,
      tag,
      modules,
      finalQuiz,
    });
  }

  //
  // ─── Render ─────────────────────────────────────────────────────────────────
  //
  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* ─── Course Details ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <h2 className="text-2xl font-semibold">Create New Course</h2>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Course Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 w-full border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
          />
        </div>

        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cover Image (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleCoverFileChange}
            className="mt-1 block w-full text-sm text-gray-700"
          />
        </div>

        {/* Category / Level / Tag */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Level
            </label>
            <input
              type="text"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="mt-1 w-full border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tag
            </label>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="mt-1 w-full border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
            />
          </div>
        </div>
      </div>

      {/* ─── Modules & Lessons ──────────────────────────────────────────────────── */}
      <section className="space-y-8">
        {modules.map((mod, mIdx) => (
          <div
            key={mIdx}
            className="bg-white border border-gray-200 rounded-lg p-6 space-y-6"
          >
            {/* Module Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* Module Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Module Title
                </label>
                <input
                  type="text"
                  value={mod.title}
                  onChange={(e) =>
                    updateModuleField(mIdx, "title", e.target.value)
                  }
                  required
                  className="mt-1 w-full border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
                />
              </div>
              {/* Module Ordering */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Module Ordering
                </label>
                <input
                  type="number"
                  min={1}
                  value={mod.ordering}
                  onChange={(e) =>
                    updateModuleField(mIdx, "ordering", Number(e.target.value))
                  }
                  required
                  className="mt-1 w-24 border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
                />
              </div>
              {/* Remove Module Button */}
              <div className="flex justify-end md:col-span-3">
                <button
                  type="button"
                  onClick={() => removeModule(mIdx)}
                  className="text-red-600 hover:underline"
                >
                  Remove Module
                </button>
              </div>
            </div>

            {/* ── Lessons List ────────────────────────────────────────────────────── */}
            <div className="space-y-6">
              {mod.lessons.map((lesson, lIdx) => (
                <div
                  key={lIdx}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    {/* Lesson Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Lesson Title
                      </label>
                      <input
                        type="text"
                        value={lesson.title}
                        onChange={(e) =>
                          updateLessonField(mIdx, lIdx, "title", e.target.value)
                        }
                        required
                        className="mt-1 w-full border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
                      />
                    </div>
                    {/* Lesson Ordering */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Ordering
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={lesson.ordering}
                        onChange={(e) =>
                          updateLessonField(
                            mIdx,
                            lIdx,
                            "ordering",
                            Number(e.target.value)
                          )
                        }
                        required
                        className="mt-1 w-24 border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
                      />
                    </div>
                    {/* Remove Lesson Button */}
                    <div className="flex justify-end md:col-span-3">
                      <button
                        type="button"
                        onClick={() => removeLesson(mIdx, lIdx)}
                        className="text-red-600 hover:underline"
                      >
                        Remove Lesson
                      </button>
                    </div>
                  </div>

                  {/* Lesson Content (Rich Text) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Lesson Content
                    </label>
                    <RichTextEditor
                      value={lesson.content}
                      onChange={(newHtml) =>
                        updateLessonField(mIdx, lIdx, "content", newHtml)
                      }
                    />
                  </div>

                  {/* Lesson Type / Image URL */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Type
                      </label>
                      <select
                        value={lesson.type}
                        onChange={(e) =>
                          updateLessonField(
                            mIdx,
                            lIdx,
                            "type",
                            e.target.value as LessonInput["type"]
                          )
                        }
                        className="mt-1 w-full border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
                      >
                        <option value="article">Article</option>
                        <option value="video">Video</option>
                        <option value="image">Image</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Image URL (optional)
                      </label>
                      <input
                        type="text"
                        value={lesson.imageUrl}
                        onChange={(e) =>
                          updateLessonField(
                            mIdx,
                            lIdx,
                            "imageUrl",
                            e.target.value
                          )
                        }
                        className="mt-1 w-full border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Lesson Button */}
              <button
                type="button"
                onClick={() => addLesson(mIdx)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                + Add Lesson
              </button>
            </div>

            {/* ── Module‐Level Quiz (optional) ────────────────────────────────────── */}
            <div className="mt-6 p-4 border border-dashed border-gray-300 rounded-lg space-y-4">
              <h4 className="text-lg font-medium">Module Quiz (optional)</h4>
              {mod.quiz === null ? (
                <button
                  type="button"
                  onClick={() => addQuizToModule(mIdx)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Add Quiz for this Module
                </button>
              ) : (
                <>
                  <QuizForm
                    initialQuiz={mod.quiz}
                    onSubmit={(newQuiz) => saveModuleQuiz(mIdx, newQuiz)}
                    onCancel={() => removeQuizFromModule(mIdx)}
                  />
                  <button
                    type="button"
                    onClick={() => removeQuizFromModule(mIdx)}
                    className="mt-2 text-sm text-red-600 hover:underline"
                  >
                    Remove This Module’s Quiz
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {/* ── Add Module Button ─────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={addModule}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          + Add Module
        </button>
      </section>

      {/* ─── Final Quiz Section ────────────────────────────────────────────────── */}
      <section className="mt-10 p-6 bg-white border border-gray-200 rounded-lg space-y-4">
        <h3 className="text-2xl font-semibold">Final Quiz (optional)</h3>
        {finalQuiz === null ? (
          <button
            type="button"
            onClick={addFinalQuiz}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            + Add Final Quiz
          </button>
        ) : (
          <>
            <QuizForm
              initialQuiz={finalQuiz}
              onSubmit={saveFinalQuiz}
              onCancel={removeFinalQuiz}
            />
            <button
              type="button"
              onClick={removeFinalQuiz}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              Remove Final Quiz
            </button>
          </>
        )}
      </section>

      {/* ─── Save + Cancel Buttons ──────────────────────────────────────────────── */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Save Course
        </button>
      </div>
    </form>
  );
}
