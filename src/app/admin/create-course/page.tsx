// src/app/admin/create-course/page.tsx
"use client";

import { useRouter } from "next/navigation";
import CourseFormWithModules from "@/components/CourseFormWithModules";
import type { CourseFormWithModulesProps } from "@/components/CourseFormWithModules";

export default function AdminCreateCoursePage() {
  const router = useRouter();

  const handleCancel = () => {
    router.push("/courses");
  };

  // Use the onSubmit signature from CourseFormWithModulesProps
  const handleSave: CourseFormWithModulesProps["onSubmit"] = async ({
    title,
    description,
    coverFile,
    category,
    level,
    tag,
    modules,
    finalQuiz,
  }) => {
    try {
      let imageUrl: string | null = null;

      if (coverFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", coverFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          const errJson = await uploadRes.json();
          throw new Error(errJson.error || "Upload failed");
        }

        const { url } = await uploadRes.json();
        imageUrl = url;
      }

      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          imageUrl, // string or null
          category,
          tag,
          level,
          modules, // ModuleFormData[]
          finalQuiz, // QuizFormData | null
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Could not create course");
      }

      const payload = await res.json();
      router.push(`/courses/${payload.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error creating course";
      alert("Could not create course: " + message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <CourseFormWithModules onSubmit={handleSave} onCancel={handleCancel} />
    </div>
  );
}
