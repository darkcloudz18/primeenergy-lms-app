// src/app/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/page.tsx

import LessonPageClient from "./components/LessonPageClient";

interface PageProps {
  params: {
    courseId: string; // unused here
    moduleId: string; // unused here
    lessonId: string;
  };
}

export default function LessonPage({ params }: PageProps) {
  const { lessonId } = params;

  return (
    <div className="max-w-3xl mx-auto my-8">
      <LessonPageClient lessonId={lessonId} />
    </div>
  );
}
