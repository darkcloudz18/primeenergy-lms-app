// src/app/api/tutor/unarchive-course/route.ts
import { NextResponse } from "next/server";
import { getSupabaseRSC } from "@/lib/supabase-rsc";

export async function POST(req: Request) {
  const sb = getSupabaseRSC();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { courseId }: { courseId?: string } = await req
    .json()
    .catch(() => ({}));
  if (!courseId)
    return NextResponse.json({ error: "Missing courseId" }, { status: 400 });

  const { error } = await sb
    .from("courses")
    .update({ archived: false })
    .eq("id", courseId)
    .eq("instructor_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
