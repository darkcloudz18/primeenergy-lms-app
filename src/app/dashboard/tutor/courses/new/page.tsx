"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@supabase/auth-helpers-react";
import CourseFormWithModules from "@/components/CourseFormWithModules";
import type { CourseFormWithModulesProps } from "@/components/CourseFormWithModules";

export default function TutorCreateCoursePage() {
  const router = useRouter();
  const session = useSession();
  const user = session?.user;

  const handleCancel = () => {
    router.push("/dashboard/tutor");
  };

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
    if (!user) {
      alert("Please sign in first.");
      return;
    }

    try {
      let imageUrl: string | null = null;

      if (coverFile) {
        const fd = new FormData();
        fd.append("file", coverFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: fd,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "Upload failed");
        }
        const { url } = await uploadRes.json();
        imageUrl = url;
      }

      // API should set instructor_id = auth user on the server
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          imageUrl,
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

      const { id } = await res.json();
      router.push(`/courses/${id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("Could not create course: " + msg);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <CourseFormWithModules onSubmit={handleSave} onCancel={handleCancel} />
    </div>
  );
}
