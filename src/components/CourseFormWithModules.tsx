"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import type { QuizFormData } from "@/components/QuizForm";
import QuizEditorInline from "@/components/QuizEditorInline";
import type { LessonInput } from "@/lib/types";

// ── Types for Form Data ──────────────────────────────────────────────────────
export interface LessonFormData {
  title: string;
  content: string; // HTML from RichTextEditor
  type: "article" | "video" | "image";
  ordering: number;
  imageUrl: string;
}

export interface ModuleFormData {
  title: string;
  ordering: number;
  lessons: LessonFormData[];
  quiz: QuizFormData | null;
}

export interface CourseFormWithModulesProps {
  onSubmit: (data: {
    title: string;
    description: string; // HTML
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
  // ─── Course State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(""); // HTML via RTE
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [tag, setTag] = useState("");

  // ─── Modules + Final Quiz
  const [modules, setModules] = useState<ModuleFormData[]>([
    { title: "", ordering: 1, lessons: [], quiz: null },
  ]);
  const [finalQuiz, setFinalQuiz] = useState<QuizFormData | null>(null);

  // ─── Helpers
  function updateModuleField<K extends keyof ModuleFormData>(
    moduleIndex: number,
    field: K,
    value: ModuleFormData[K]
  ) {
    setModules((prev) =>
      prev.map((m, i) => (i === moduleIndex ? { ...m, [field]: value } : m))
    );
  }

  function addModule() {
    setModules((prev) => [
      ...prev,
      { title: "", ordering: prev.length + 1, lessons: [], quiz: null },
    ]);
  }

  function removeModule(moduleIndex: number) {
    setModules((prev) => prev.filter((_, i) => i !== moduleIndex));
  }

  function addLesson(moduleIndex: number) {
    setModules((prev) =>
      prev.map((m, i) => {
        if (i !== moduleIndex) return m;
        const nextOrder = m.lessons.length + 1;
        return {
          ...m,
          lessons: [
            ...m.lessons,
            {
              title: "",
              content: "",
              type: "article",
              ordering: nextOrder,
              imageUrl: "",
            },
          ],
        };
      })
    );
  }

  function removeLesson(moduleIndex: number, lessonIndex: number) {
    setModules((prev) =>
      prev.map((m, i) => {
        if (i !== moduleIndex) return m;
        const pruned = m.lessons.filter((_, li) => li !== lessonIndex);
        // normalize ordering
        const normalized = pruned.map((l, idx) => ({
          ...l,
          ordering: idx + 1,
        }));
        return { ...m, lessons: normalized };
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
      prev.map((m, i) => {
        if (i !== moduleIndex) return m;
        const lessons = m.lessons.map((l, li) =>
          li === lessonIndex ? { ...l, [field]: value } : l
        );
        return { ...m, lessons };
      })
    );
  }

  function addQuizToModule(moduleIndex: number) {
    const blank: QuizFormData = {
      title: "",
      description: "",
      passing_score: 0,
      questions: [],
    };
    updateModuleField(moduleIndex, "quiz", blank);
  }

  function removeQuizFromModule(moduleIndex: number) {
    updateModuleField(moduleIndex, "quiz", null);
  }

  function saveModuleQuiz(moduleIndex: number, quizData: QuizFormData) {
    updateModuleField(moduleIndex, "quiz", quizData);
  }

  // Final quiz controls
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

  // Cover upload
  function handleCoverFileChange(e: ChangeEvent<HTMLInputElement>) {
    setCoverFile(e.target.files?.[0] || null);
  }

  // Submit
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

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Course details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <h2 className="text-2xl font-semibold">Create New Course</h2>

        <label className="block">
          <span className="text-sm text-gray-700">Course Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 w-full border-gray-300 rounded px-3 py-2"
          />
        </label>

        <div>
          <span className="block text-sm text-gray-700">Description</span>
          <RichTextEditor value={description} onChange={setDescription} />
        </div>

        <div>
          <span className="block text-sm text-gray-700">
            Cover Image (optional)
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleCoverFileChange}
            className="mt-1 block w-full text-sm text-gray-700"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-sm text-gray-700">Category</span>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full border-gray-300 rounded px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Level</span>
            <input
              type="text"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="mt-1 w-full border-gray-300 rounded px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Tag</span>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="mt-1 w-full border-gray-300 rounded px-3 py-2"
            />
          </label>
        </div>
      </div>

      {/* Modules */}
      <section className="space-y-8">
        {modules.map((mod, mIdx) => (
          <div
            key={mIdx}
            className="bg-white border border-gray-200 rounded-lg p-6 space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <label className="block">
                <span className="text-sm text-gray-700">Module Title</span>
                <input
                  type="text"
                  value={mod.title}
                  onChange={(e) =>
                    updateModuleField(mIdx, "title", e.target.value)
                  }
                  required
                  className="mt-1 w-full border-gray-300 rounded px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-sm text-gray-700">Ordering</span>
                <input
                  type="number"
                  min={1}
                  value={mod.ordering}
                  onChange={(e) =>
                    updateModuleField(mIdx, "ordering", Number(e.target.value))
                  }
                  required
                  className="mt-1 w-24 border-gray-300 rounded px-3 py-2"
                />
              </label>

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

            {/* Lessons */}
            <div className="space-y-6">
              {mod.lessons.map((lesson, lIdx) => (
                <div
                  key={lIdx}
                  className="bg-gray-50 border rounded-lg p-4 space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <label className="block">
                      <span className="text-sm text-gray-700">
                        Lesson Title
                      </span>
                      <input
                        type="text"
                        value={lesson.title}
                        onChange={(e) =>
                          updateLessonField(mIdx, lIdx, "title", e.target.value)
                        }
                        required
                        className="mt-1 w-full border-gray-300 rounded px-3 py-2"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm text-gray-700">Ordering</span>
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
                        className="mt-1 w-24 border-gray-300 rounded px-3 py-2"
                      />
                    </label>

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

                  <div>
                    <span className="block text-sm text-gray-700">
                      Lesson Content
                    </span>
                    <RichTextEditor
                      value={lesson.content}
                      onChange={(html) =>
                        updateLessonField(mIdx, lIdx, "content", html)
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="block">
                      <span className="text-sm text-gray-700">Type</span>
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
                        className="mt-1 w-full border-gray-300 rounded px-3 py-2"
                      >
                        <option value="article">Article</option>
                        <option value="video">Video</option>
                        <option value="image">Image</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm text-gray-700">
                        Image URL (optional)
                      </span>
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
                        className="mt-1 w-full border-gray-300 rounded px-3 py-2"
                      />
                    </label>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => addLesson(mIdx)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                + Add Lesson
              </button>
            </div>

            {/* Module Quiz (auto-save) */}
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
                <QuizEditorInline
                  value={mod.quiz}
                  onChange={(q) => saveModuleQuiz(mIdx, q)}
                  onRemove={() => removeQuizFromModule(mIdx)}
                  heading="Module Quiz"
                />
              )}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addModule}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          + Add Module
        </button>
      </section>

      {/* Final Quiz (auto-save) */}
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
          <QuizEditorInline
            value={finalQuiz}
            onChange={setFinalQuiz}
            onRemove={removeFinalQuiz}
            heading="Final Quiz"
          />
        )}
      </section>

      {/* Submit */}
      <div className="flex justify-end gap-4">
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
