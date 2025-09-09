export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSupabaseRSC } from "@/lib/supabase-rsc";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import QuizEditor, {
  EditorQuiz,
  EditorQuestion,
} from "@/components/QuizEditor";

function isAdminRole(role?: string | null) {
  const r = (role ?? "").toLowerCase().trim();
  return r === "admin" || r === "super admin";
}

interface PageProps {
  params: { courseId: string };
}

export default async function TutorFinalQuizNewPage({ params }: PageProps) {
  const { courseId } = params;
  const sb = getSupabaseRSC();

  // who is the user?
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return <div className="p-6 text-red-600">Not authenticated.</div>;
  }

  // load course & check ownership/admin
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("id,instructor_id,title")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) {
    return <div className="p-6 text-red-600">Course not found.</div>;
  }

  let isAdmin = false;
  {
    const { data: prof } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = isAdminRole(prof?.role);
  }

  if (!isAdmin && course.instructor_id !== user.id) {
    return <div className="p-6 text-red-600">Forbidden.</div>;
  }

  // initial empty final quiz
  const initialQuiz: EditorQuiz = {
    course_id: courseId,
    module_id: null,
    title: "",
    passing_score: 0,
  };
  const initialQuestions: EditorQuestion[] = [];

  const back = `/dashboard/tutor/courses/edit/${courseId}`;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Final Quiz</h1>
        <Link href={back} className="text-blue-600 hover:underline">
          ← Back
        </Link>
      </div>

      <QuizEditor
        initialQuiz={initialQuiz}
        initialQuestions={initialQuestions}
        courseId={courseId}
        moduleId={null}
        afterSaveBase="/dashboard/tutor"
      />
    </main>
  );
}
