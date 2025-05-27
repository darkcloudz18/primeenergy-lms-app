// src/app/api/courses/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // make sure this is your service‐role client

interface LessonInput {
  title: string;
  content: string; // HTML from your editor
  type: "article" | "video" | "image";
  ordering: number;
  imageUrl?: string | null;
}

interface NewCourseBody {
  title: string;
  description?: string;
  imageUrl?: string | null;
  category?: string;
  tag?: string;
  level?: string;
  lessons: LessonInput[];
}

export async function POST(request: Request) {
  // 1) parse & type the incoming JSON
  const body = (await request.json()) as NewCourseBody;
  const { title, description, imageUrl, category, tag, level, lessons } = body;

  // 2) insert the course using your admin client (bypasses RLS)
  const { data: course, error: courseError } = await supabaseAdmin
    .from("courses")
    .insert({
      title,
      description,
      image_url: imageUrl,
      category,
      tag,
      level,
    })
    .select()
    .single();

  if (courseError || !course) {
    return NextResponse.json(
      { error: courseError?.message || "Unknown" },
      { status: 500 }
    );
  }

  // 3) insert all lessons for that course
  const toInsert = lessons.map((lesson) => ({
    course_id: course.id,
    title: lesson.title,
    content: lesson.content,
    type: lesson.type,
    ordering: lesson.ordering,
    image_url: lesson.imageUrl ?? null,
  }));

  const { error: lessonsError } = await supabaseAdmin
    .from("lessons")
    .insert(toInsert);

  if (lessonsError) {
    return NextResponse.json({ error: lessonsError.message }, { status: 500 });
  }

  // 4) return the new course ID
  return NextResponse.json({ id: course.id });
}
