// src/app/api/upload/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  const form = await request.formData();
  const fileEntry = form.get("file");
  const bucketEntry = form.get("bucket");

  if (!(fileEntry instanceof Blob) || typeof bucketEntry !== "string") {
    return NextResponse.json({ error: "Invalid upload data" }, { status: 400 });
  }

  const bucket = bucketEntry;
  const file = fileEntry;
  const filename = `${uuidv4()}_${file.name}`;

  // 1) Upload the file
  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filename, file, { cacheControl: "3600", upsert: false });

  if (uploadError || !uploadData?.path) {
    console.error("Upload error:", uploadError);
    return NextResponse.json(
      { error: uploadError?.message || "Upload failed" },
      { status: 500 }
    );
  }

  // 2) Generate the public URL (no error returned here)
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(bucket).getPublicUrl(uploadData.path);

  return NextResponse.json({ url: publicUrl });
}
