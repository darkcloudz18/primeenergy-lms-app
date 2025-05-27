// src/components/CourseLessonPage.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Course, Lesson } from "@/lib/types";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";

interface Props {
  course: Course;
  initialLessons: Lesson[];
}

export default function CourseLessonPage({ course, initialLessons }: Props) {
  const supabase = createClientComponentClient();

  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(
    initialLessons[0] ?? null
  );
  const [loading, setLoading] = useState(false);

  // TipTap editor instance
  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension,
      Placeholder.configure({ placeholder: "Write your lesson content…" }),
    ],
    content: selectedLesson?.content || "",
    onUpdate({ editor }) {
      // keep our state in sync
      const html = editor.getHTML();
      setCurrentContent(html);
    },
  });

  // whenever you switch lessons, update the editor content
  useEffect(() => {
    if (editor) {
      editor.commands.setContent(selectedLesson?.content || "");
    }
  }, [selectedLesson, editor]);

  // local state for the editor’s content HTML
  const [currentContent, setCurrentContent] = useState(
    selectedLesson?.content || ""
  );

  /** Upload a selected file to Supabase, then insert it into the editor */
  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      // generate a unique path: e.g. "uploads/lesson-<id>/myimage.png"
      const path = `uploads/${selectedLesson?.id || "temp"}/${file.name}`;

      setLoading(true);
      const { data, error } = await supabase.storage
        .from("uploads")
        .upload(path, file, { upsert: true });

      if (error) {
        console.error("Upload error:", error.message);
        setLoading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("uploads").getPublicUrl(data.path);

      // insert into TipTap
      editor.chain().focus().setImage({ src: publicUrl }).run();
      setLoading(false);
    },
    [editor, selectedLesson, supabase]
  );

  /** Save the updated lesson (HTML) back to your API */
  async function saveContent() {
    if (!selectedLesson) return;
    setLoading(true);
    const res = await fetch(
      `/api/courses/${course.id}/lessons/${selectedLesson.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: currentContent }),
      }
    );
    setLoading(false);

    if (!res.ok) {
      alert("Failed to save: " + (await res.text()));
    } else {
      // optimistic UI: update our local list
      setLessons((ls) =>
        ls.map((l) =>
          l.id === selectedLesson.id ? { ...l, content: currentContent } : l
        )
      );
      alert("Lesson saved!");
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-white border-r p-6 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Lessons</h2>
        <ul className="space-y-2">
          {lessons.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => setSelectedLesson(l)}
                className={`w-full text-left px-3 py-2 rounded ${
                  selectedLesson?.id === l.id
                    ? "bg-green-100 text-green-700"
                    : "hover:bg-green-50 text-gray-700"
                }`}
              >
                {l.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 p-6 md:p-8">
        {selectedLesson ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">{selectedLesson.title}</h1>

            {/* image upload */}
            <div>
              <label className="block mb-1 font-medium">Insert Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={loading}
                className="mb-4"
              />
            </div>

            {/* the TipTap editor */}
            <div className="border rounded bg-white">
              <EditorContent editor={editor} className="prose p-4" />
            </div>

            <button
              onClick={saveContent}
              disabled={loading}
              className="mt-2 px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save Lesson"}
            </button>
          </div>
        ) : (
          <p>Select a lesson to begin editing.</p>
        )}
      </main>
    </div>
  );
}
