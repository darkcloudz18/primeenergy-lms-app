// src/components/CourseForm.tsx
"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { uploadImage } from "@/lib/upload";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";

type LessonInput = {
  title: string;
  content: string; // HTML from Tiptap
  type: "article" | "video" | "image";
  ordering: number;
  imageUrl: string | null;
};

function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="border rounded mb-4">
      <div className="bg-gray-50 p-2 flex space-x-2">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className="font-bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className="italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
        >
          Center
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="min-h-[120px] p-2 prose prose-sm prose-green"
      />
    </div>
  );
}

export default function CourseForm() {
  const router = useRouter();

  // --- Course fields ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [level, setLevel] = useState("");
  const [uploadingCourseImage, setUploadingCourseImage] = useState(false);

  // --- Lessons state ---
  const [lessons, setLessons] = useState<LessonInput[]>([
    { title: "", content: "", type: "article", ordering: 1, imageUrl: null },
  ]);

  // --- Handlers ---
  async function handleCourseImageChange(e: ChangeEvent<HTMLInputElement>) {
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
  }

  function updateLesson(
    idx: number,
    changes: Partial<Omit<LessonInput, "ordering">>
  ) {
    setLessons((ls) =>
      ls.map((l, i) => (i === idx ? { ...l, ...changes } : l))
    );
  }

  function addLesson() {
    setLessons((ls) => [
      ...ls,
      {
        title: "",
        content: "",
        type: "article",
        ordering: ls.length + 1,
        imageUrl: null,
      },
    ]);
  }

  function removeLesson(idx: number) {
    setLessons((ls) =>
      ls.filter((_, i) => i !== idx).map((l, i) => ({ ...l, ordering: i + 1 }))
    );
  }

  async function handleLessonImage(
    e: ChangeEvent<HTMLInputElement>,
    idx: number
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      updateLesson(idx, { imageUrl: url });
    } catch (err) {
      alert("Lesson image upload failed: " + (err as Error).message);
    }
  }

  // --- Submit ---
  const [saving, setSaving] = useState(false);
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      title,
      description,
      imageUrl: thumbnailUrl,
      category,
      tag,
      level,
      lessons,
    };

    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    setSaving(false);

    if (res.ok) {
      router.push(`/courses/${json.id}`);
    } else {
      alert("Error: " + json.error);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Create a New Course</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Course Details */}
        <div className="space-y-4">
          <div>
            <label className="block font-medium text-gray-800">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 w-full border-gray-300 rounded px-3 py-2 border"
            />
          </div>
          <div>
            <label className="block font-medium text-gray-800">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full border-gray-300 rounded px-3 py-2 border"
            />
          </div>
          <div>
            <label className="block font-medium text-gray-800">
              Course Thumbnail
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleCourseImageChange}
              className="mt-1"
            />
            {uploadingCourseImage && (
              <p className="mt-1 text-sm text-gray-600">Uploading…</p>
            )}
            {thumbnailUrl && (
              <div className="mt-2 h-40 relative rounded overflow-hidden border">
                <Image
                  src={thumbnailUrl}
                  alt="Thumbnail preview"
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-gray-800">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full border-gray-300 rounded px-3 py-2 border"
                placeholder="e.g. Solar Energy 101"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-800">Tag</label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="mt-1 w-full border-gray-300 rounded px-3 py-2 border"
                placeholder="e.g. Beginner"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-800">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="mt-1 w-full border-gray-300 rounded px-3 py-2 border"
              >
                <option value="">Select level</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lessons */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Lessons</h2>
          {lessons.map((lesson, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded p-4 space-y-3"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Lesson {i + 1}</h3>
                {lessons.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLesson(i)}
                    className="text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div>
                <label className="block text-gray-700">Title</label>
                <input
                  type="text"
                  value={lesson.title}
                  onChange={(e) => updateLesson(i, { title: e.target.value })}
                  required
                  className="mt-1 w-full border-gray-300 rounded px-2 py-1 border"
                />
              </div>

              <div>
                <label className="block text-gray-700">Type</label>
                <select
                  value={lesson.type}
                  onChange={(e) =>
                    updateLesson(i, {
                      type: e.target.value as LessonInput["type"],
                    })
                  }
                  className="mt-1 w-full border-gray-300 rounded px-2 py-1 border"
                >
                  <option value="article">Article</option>
                  <option value="video">Video</option>
                  <option value="image">Image</option>
                </select>
              </div>

              {lesson.type === "image" && (
                <div>
                  <label className="block text-gray-700">Lesson Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLessonImage(e, i)}
                    className="mt-1"
                  />
                  {lesson.imageUrl && (
                    <div className="mt-2 h-32 relative rounded overflow-hidden border">
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

              <div>
                <label className="block text-gray-700">Content</label>
                <RichTextEditor
                  value={lesson.content}
                  onChange={(html) => updateLesson(i, { content: html })}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addLesson}
            className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            + Add Lesson
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving || uploadingCourseImage}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Create Course & Lessons"}
        </button>
      </form>
    </div>
  );
}
