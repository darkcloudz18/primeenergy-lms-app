// src/components/RichTextEditor.tsx
"use client";

import React, { useState, ChangeEvent } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import ImageExtension from "@tiptap/extension-image";
import {
  PhotoIcon,
  BoldIcon,
  ItalicIcon,
  ListBulletIcon,
  HashtagIcon,
} from "@heroicons/react/24/outline";
import { uploadImage } from "@/lib/upload";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({
  value,
  onChange,
}: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ImageExtension,
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      console.error(err);
      alert("Image upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (!editor) return null;

  return (
    <div className="border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-500">
      {/* Toolbar */}
      <div className="bg-gray-50 p-2 flex space-x-2">
        {/* Bold */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "text-green-600" : ""}
          aria-label="Bold"
        >
          <BoldIcon className="w-5 h-5" />
        </button>
        {/* Italic */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "text-green-600" : ""}
          aria-label="Italic"
        >
          <ItalicIcon className="w-5 h-5" />
        </button>
        {/* Bullet List */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "text-green-600" : ""}
          aria-label="Bullet List"
        >
          <ListBulletIcon className="w-5 h-5" />
        </button>
        {/* Numbered List */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "text-green-600" : ""}
          aria-label="Numbered List"
        >
          <HashtagIcon className="w-5 h-5" />
        </button>
        {/* Image Upload */}
        <label className="cursor-pointer">
          <PhotoIcon className="w-5 h-5 inline-block" />
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Editor area: big and ready to type */}
      <div
        onClick={() => editor.chain().focus().run()}
        className="
          cursor-text
          min-h-[240px]
          p-4
          focus-within:ring-2 focus-within:ring-blue-400
        "
      >
        <EditorContent
          editor={editor}
          className="min-h-[200px] p-4 prose prose-sm prose-green focus:outline-none focus:ring-0"
        />
      </div>
    </div>
  );
}
