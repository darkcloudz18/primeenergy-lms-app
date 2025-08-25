"use client";

import { useRef, useState } from "react";
import Image from "next/image";

type Props = {
  courseId: string;
  inputName: string; // the name attribute your form expects (e.g. "image_url")
  label?: string;
  defaultUrl?: string;
  bucket?: string; // defaults to "course-images"
};

export default function CourseImageUpload({
  courseId,
  inputName,
  label = "Course image",
  defaultUrl = "",
  bucket = "course-images",
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string>(defaultUrl);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("courseId", courseId);
    form.append("bucket", bucket);

    setUploading(true);
    try {
      const res = await fetch("/api/admin/courses/upload-image", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Upload failed");
      setPreview(json.publicUrl);
      // write into the form’s hidden input so your existing POST saves it
      const hidden = document.querySelector<HTMLInputElement>(
        `input[name="${inputName}"]`
      );
      if (hidden) hidden.value = json.publicUrl;
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block font-medium mb-1">{label}</label>
      {/* Hidden field used by the server form submit */}
      <input type="hidden" name={inputName} defaultValue={defaultUrl} />

      <div className="flex items-center gap-4">
        <div className="relative w-40 h-24 rounded border overflow-hidden bg-gray-50">
          {preview ? (
            <Image
              src={preview}
              alt="Course image"
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-xs text-gray-400">
              No image
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
            disabled={uploading}
          />
          {uploading && (
            <span className="text-sm text-gray-500">Uploading…</span>
          )}
        </div>
      </div>
    </div>
  );
}
