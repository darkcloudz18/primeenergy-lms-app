// src/lib/upload.ts
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("bucket", "uploads");

  // <-- updated path to match your route file
  const res = await fetch("/api/courses/upload", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Upload failed");
  }

  const { url } = await res.json();
  return url;
}
