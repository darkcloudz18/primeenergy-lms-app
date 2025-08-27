"use client";

import { useState } from "react";

type Props = {
  courseId: string;
  defaultUrl?: string;
  /** Name of the hidden field the page form expects (e.g. "image_url") */
  inputName: string;
  label?: string;
  /** Supabase Storage bucket name, e.g. "course-images" */
  bucket: string;
};

export default function CourseImageUpload({
  courseId,
  defaultUrl = "",
  inputName,
  label = "Image",
  bucket,
}: Props) {
  const [url, setUrl] = useState(defaultUrl);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErr(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("courseId", courseId);
      fd.append("bucket", bucket);
      fd.append("file", file);

      const res = await fetch("/api/admin/courses/upload-image", {
        method: "POST",
        body: fd, // don't set Content-Type; the browser sets boundary
      });

      // This route ALWAYS returns JSON (success or error)
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Upload failed");

      setUrl(json.url as string);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block font-medium mb-1">{label}</label>

      {/* Hidden field so your existing form POST includes the image URL */}
      <input type="hidden" name={inputName} value={url} readOnly />

      <div className="flex items-start gap-4">
        <div className="h-28 w-44 rounded border bg-gray-50 overflow-hidden flex items-center justify-center">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Course"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-gray-400 text-sm">No image</span>
          )}
        </div>

        <div className="space-y-2">
          <input
            type="file"
            accept="image/*"
            onChange={onChange}
            disabled={uploading}
          />
          {uploading && <div className="text-xs text-gray-500">Uploading…</div>}
          {err && <div className="text-xs text-red-600">{err}</div>}
          {url && (
            <div className="text-xs text-gray-500 break-all max-w-sm">
              {url}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
