// src/lib/upload.ts
export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    credentials: "include", // ✅ send auth cookie
    body: fd, // don't set Content-Type manually
  });

  if (!res.ok) {
    // try json, else text
    try {
      const j = await res.json();
      throw new Error(j.error || "Upload failed");
    } catch {
      throw new Error(await res.text());
    }
  }

  const { url } = await res.json();
  return url as string;
}
