// src/app/admin/create-course/page.tsx
"use client";

import { useRouter } from "next/navigation";
import CourseForm, { CourseFormData } from "@/components/CourseForm";

export default function AdminCreateCoursePage() {
  const router = useRouter();

  async function onSubmit(data: CourseFormData) {
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (res.ok) {
      router.push(`/courses/${json.id}`);
    } else {
      alert("Error: " + json.error);
    }
  }

  return <CourseForm onSubmit={onSubmit} />;
}
