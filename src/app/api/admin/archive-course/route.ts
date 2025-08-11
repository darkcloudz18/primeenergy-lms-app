// src/app/api/admin/archive-course/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { courseId } = await req.json();

  // auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // authorize (admin or super admin or course instructor)
  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (prof?.role || "").toLowerCase();
  if (!["admin", "super admin"].includes(role)) {
    // allow instructor of the course
    const { data: course } = await supabase
      .from("courses")
      .select("instructor_id")
      .eq("id", courseId)
      .maybeSingle();
    if (!course || course.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { error } = await supabase
    .from("courses")
    .update({ archived: true })
    .eq("id", courseId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
