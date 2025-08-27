import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST multipart/form-data:
 *  - bucket: string (e.g. "course-images")
 *  - courseId: string
 *  - file: File
 *
 * Returns: { url: string } on success or { error: string } on failure
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const courseId = (form.get("courseId") as string) || "misc";
    const bucket = (form.get("bucket") as string) || "course-images";

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const key = `courses/${courseId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(key, file, {
        upsert: true,
        cacheControl: "3600",
        contentType: file.type || undefined,
      });

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 });
    }

    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(key);
    return NextResponse.json({ url: pub.publicUrl }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Upload failed" },
      { status: 500 }
    );
  }
}
