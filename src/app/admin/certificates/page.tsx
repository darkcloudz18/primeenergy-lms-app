"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Template = {
  id: string;
  name: string;
  image_url: string;
  name_x: number;
  name_y: number;
  course_x: number;
  course_y: number;
  date_x: number;
  date_y: number;
  font_size: number;
  font_color: string;
  is_active: boolean;
};

export default function AdminCertificatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // form inputs
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [fontSize, setFontSize] = useState(48);
  const [fontColor, setFontColor] = useState("#0b3d2e");
  const [pos, setPos] = useState({
    name_x: 600,
    name_y: 420,
    course_x: 600,
    course_y: 520,
    date_x: 600,
    date_y: 620,
  });

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/certificates/templates", {
      credentials: "include",
    });
    const j = await res.json();
    setTemplates(j.templates ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Upload to our server route which stores in Supabase Storage (and can auto-create bucket)
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/admin/certificates/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Upload failed");

      setImageUrl(j.url); // use returned public URL
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const onCreate = async () => {
    if (!name || !imageUrl) {
      alert("Please fill name and upload a background image (or paste a URL).");
      return;
    }
    const res = await fetch("/api/admin/certificates/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name,
        image_url: imageUrl,
        ...pos,
        font_size: fontSize,
        font_color: fontColor,
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      alert(j.error || "Create failed");
      return;
    }
    setName("");
    setImageUrl("");
    await load();
  };

  const setActive = async (id: string) => {
    const res = await fetch(`/api/admin/certificates/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_active: true }),
    });
    const j = await res.json();
    if (!res.ok) {
      alert(j.error || "Activate failed");
      return;
    }
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const res = await fetch(`/api/admin/certificates/templates/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const j = await res.json();
    if (!res.ok) {
      alert(j.error || "Delete failed");
      return;
    }
    await load();
  };

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Certificate Templates</h1>

      {/* Create new template */}
      <section className="bg-white rounded shadow p-4 space-y-4">
        <h2 className="text-lg font-medium">Create / Upload Template</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Left: form */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Name</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template 1"
            />

            <label className="block text-sm font-medium mt-2">
              Upload Background Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="block w-full text-sm"
            />
            {uploading && (
              <p className="text-xs text-gray-500 mt-1">Uploading…</p>
            )}
            {uploadError && (
              <p className="text-xs text-red-600 mt-1">{uploadError}</p>
            )}

            <label className="block text-sm font-medium mt-2">
              (Optional) Background Image URL
            </label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Or paste an image URL"
            />

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-sm font-medium">Font Size</label>
                <input
                  type="number"
                  className="border rounded px-3 py-2 w-full"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Font Color</label>
                <input
                  type="text"
                  className="border rounded px-3 py-2 w-full"
                  value={fontColor}
                  onChange={(e) => setFontColor(e.target.value)}
                />
              </div>
            </div>

            {/* positions */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(
                [
                  ["name_x", "Name X"],
                  ["name_y", "Name Y"],
                  ["course_x", "Course X"],
                  ["course_y", "Course Y"],
                  ["date_x", "Date X"],
                  ["date_y", "Date Y"],
                ] as const
              ).map(([k, label]) => (
                <div key={k}>
                  <label className="block text-sm font-medium">{label}</label>
                  <input
                    type="number"
                    className="border rounded px-3 py-2 w-full"
                    value={pos[k]}
                    onChange={(e) =>
                      setPos((p) => ({ ...p, [k]: Number(e.target.value) }))
                    }
                  />
                </div>
              ))}
            </div>

            <button
              onClick={onCreate}
              className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save Template
            </button>
          </div>

          {/* Right: live preview */}
          <div>
            <div
              className="relative border rounded overflow-hidden bg-gray-50"
              style={{ width: 600, height: 400 }}
            >
              {imageUrl && (
                <Image
                  src={imageUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              )}
              <div
                style={{
                  position: "absolute",
                  left: pos.name_x * 0.5,
                  top: pos.name_y * 0.5,
                  fontSize: fontSize * 0.5,
                  color: fontColor,
                  fontWeight: 700,
                }}
              >
                John
              </div>
              <div
                style={{
                  position: "absolute",
                  left: pos.course_x * 0.5,
                  top: pos.course_y * 0.5,
                  fontSize: Math.max(fontSize - 6, 24) * 0.5,
                  color: fontColor,
                }}
              >
                Intro to Solar
              </div>
              <div
                style={{
                  position: "absolute",
                  left: pos.date_x * 0.5,
                  top: pos.date_y * 0.5,
                  fontSize: 20 * 0.5,
                  color: fontColor,
                }}
              >
                01/01/2025
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Preview is scaled (1200×800 → 600×400).
            </p>
          </div>
        </div>
      </section>

      {/* Existing templates */}
      <section className="bg-white rounded shadow p-4 space-y-4">
        <h2 className="text-lg font-medium">Existing Templates</h2>

        {loading ? (
          <p>Loading…</p>
        ) : templates.length === 0 ? (
          <p>No templates yet.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <li key={t.id} className="border rounded p-3 space-y-2">
                <div className="relative w-full h-32 rounded overflow-hidden bg-gray-50">
                  <Image
                    src={t.image_url}
                    alt={t.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-gray-500">
                      {t.is_active ? "Active" : "Inactive"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!t.is_active && (
                      <button
                        onClick={() => setActive(t.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => remove(t.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
