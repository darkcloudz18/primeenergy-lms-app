// src/components/AdminCreateCourse.tsx
"use client";

import CourseForm, { CourseFormData } from "./CourseForm";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { useRouter } from "next/navigation";

export default function AdminCreateCourse() {
  const router = useRouter();

  async function handleCreate(data: CourseFormData) {
    // 1) insert course
    const { data: course, error: courseErr } = await supabaseAdmin
      .from("courses")
      .insert({
        title: data.title,
        description: data.description,
        image_url: data.imageUrl,
        category: data.category,
        tag: data.tag,
        level: data.level,
      })
      .select()
      .single();
    if (courseErr) throw courseErr;

    // 2) insert lessons
    const lessonsToInsert = data.lessons.map((l) => ({
      course_id: course.id,
      title: l.title,
      content: l.content,
      type: l.type,
      ordering: l.ordering,
      image_url: l.imageUrl,
    }));
    const { error: lessonsErr } = await supabaseAdmin
      .from("lessons")
      .insert(lessonsToInsert);
    if (lessonsErr) throw lessonsErr;

    // 3) navigate back to dashboard or course list
    router.push("/admin");
  }

  return <CourseForm onSubmit={handleCreate} />;
}
