// src/app/courses/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { uploadImage } from "@/lib/upload";

export default function NewCoursePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [level, setLevel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setImageUrl(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Upload failed: " + msg);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = { title, description, imageUrl, category, tag, level };
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setLoading(false);

    if (res.ok) {
      router.push(`/courses/${json.id}`);
    } else {
      alert("Error creating course: " + json.error);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Create a New Course</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block font-medium text-gray-800">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-gray-800 focus:ring-green-400 focus:outline-none"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block font-medium text-gray-800">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-gray-800 focus:ring-green-400 focus:outline-none"
            rows={4}
          />
        </div>

        {/* Thumbnail Upload */}
        <div>
          <label className="block font-medium text-gray-800">
            Course Thumbnail
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mt-1 text-gray-800"
          />
          {uploading && (
            <p className="mt-1 text-sm text-gray-600">Uploading…</p>
          )}
          {imageUrl && (
            <div className="mt-2 w-full h-40 relative rounded overflow-hidden border">
              <Image
                src={imageUrl}
                alt="Preview"
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block font-medium text-gray-800">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-gray-800 focus:ring-green-400 focus:outline-none"
            placeholder="e.g. Solar Energy 101"
          />
        </div>

        {/* Tag */}
        <div>
          <label className="block font-medium text-gray-800">Tag</label>
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-gray-800 focus:ring-green-400 focus:outline-none"
            placeholder="e.g. Beginner"
          />
        </div>

        {/* Level */}
        <div>
          <label className="block font-medium text-gray-800">Level</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-gray-800 focus:ring-green-400 focus:outline-none"
          >
            <option value="">Select level</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Expert">Expert</option>
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Create Course"}
        </button>
      </form>
    </div>
  );
}
