// src/app/api/upload/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // 1) Parse multipart/form-data
  const formData = await request.formData();
  const file = formData.get("file") as Blob | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // 2) Use your existing bucket name:
  const bucketName = "uploads";
  const filename = `${Date.now()}_${(file as File).name}`;

  // 3) Use the service‐role Supabase client to write to Storage
  const supabase = createServerClient();

  // 4) Upload the blob into the "uploads" bucket
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filename, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError || !uploadData) {
    return NextResponse.json(
      { error: uploadError?.message ?? "Upload failed" },
      { status: 500 }
    );
  }

  // 5) Fetch a public URL for that newly uploaded file
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filename);
  if (!urlData?.publicUrl) {
    return NextResponse.json(
      { error: "Could not get public URL" },
      { status: 500 }
    );
  }

  // 6) Return JSON containing the publicly accessible URL
  return NextResponse.json({ url: urlData.publicUrl });
}
