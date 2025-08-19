// src/app/api/upload/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // <-- service-role client

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const blob = formData.get("file") as Blob | null;

    if (!blob) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const file = blob as File;
    const bucket = "uploads"; // make sure this bucket exists
    const filename = `${Date.now()}_${file.name}`; // you can prefix with user id if you want

    // Upload with service role (bypasses Storage RLS)
    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filename, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadErr || !uploadData) {
      return NextResponse.json(
        { error: uploadErr?.message || "Upload failed" },
        { status: 500 }
      );
    }

    // Get a public URL (works if bucket is public; if not, use signed URL instead)
    const { data: publicData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(uploadData.path);

    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) {
      return NextResponse.json(
        { error: "Could not resolve public URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: publicUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
