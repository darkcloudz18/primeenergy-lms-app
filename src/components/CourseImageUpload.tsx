"use client";

import { useState } from "react";
import Image from "next/image";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

type Props = {
  courseId: string;
  inputName: string; // hidden input name to write the public URL into
  bucket: string; // Supabase Storage bucket (e.g. "course-images")
  label?: string; // field label
  defaultUrl?: string; // initial image URL (optional)
};

export default function CourseImageUpload({
  courseId,
  inputName,
  bucket,
  label = "Course image",
  defaultUrl = "",
}: Props) {
  const supabase = useSupabaseClient();
  const [url, setUrl] = useState<string>(defaultUrl);
  const [uploading, setUploading] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // store at: courseId/<timestamp>-<filename>
      const path = `${courseId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: false });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      setUrl(pub.publicUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Upload failed: ${msg}`);
    } finally {
      setUploading(false);
      // reset the file input so selecting the same file again will re-trigger change
      e.currentTarget.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label className="block font-medium">{label}</label>

      {/* hidden input that your server action / API reads */}
      <input type="hidden" name={inputName} value={url} />

      {/* preview */}
      {url ? (
        <div className="relative h-40 w-full rounded overflow-hidden bg-gray-100">
          <Image
            src={url}
            alt="Course image"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 640px"
          />
        </div>
      ) : (
        <div className="h-40 w-full grid place-items-center rounded bg-gray-100 text-sm text-gray-500">
          No image
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 px-3 py-2 border rounded cursor-pointer hover:bg-gray-50">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
            disabled={uploading}
          />
          {uploading ? "Uploading…" : "Choose image"}
        </label>

        {url && (
          <button
            type="button"
            onClick={() => setUrl("")}
            className="px-3 py-2 border rounded hover:bg-gray-50"
            disabled={uploading}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
