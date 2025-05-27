// File: src/app/api/courses/[courseId]/lessons/route.ts

import { NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const revalidate = 0;

export async function POST(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  const supabase = createServerComponentClient({ cookies });
  const { courseId } = params;

  // parse the incoming JSON
  const { title, content, type } = (await req.json()) as {
    title: string;
    content: string;
    type: "article" | "video" | "image";
  };

  // find the current max order for that course
  const { data: last } = await supabase
    .from("lessons")
    .select("order")
    .eq("course_id", courseId)
    .order("order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (last?.order ?? 0) + 1;

  // insert the new lesson
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      course_id: courseId,
      title,
      content,
      type,
      ordering: nextOrder,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
