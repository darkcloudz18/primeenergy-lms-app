// src/app/admin/courses/edit/[courseId]/final-quiz/new/page.tsx
export const dynamic = "force-dynamic";

import QuizEditor, {
  type EditorQuiz,
  type EditorQuestion,
} from "@/components/QuizEditor";
import { getSupabaseRSC } from "@/lib/supabase-rsc";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isAdminRole(role?: string | null) {
  const r = (role ?? "").toLowerCase().trim();
  return r === "admin" || r === "super admin";
}

interface PageProps {
  params: { courseId: string };
}

export default async function AdminNewFinalQuizPage({ params }: PageProps) {
  const { courseId } = params;

  // Authn/Authz: require admin
  const sb = getSupabaseRSC();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return <div className="p-6 text-red-600">Not authenticated.</div>;

  const { data: prof } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isAdminRole(prof?.role)) {
    return <div className="p-6 text-red-600">Admins only.</div>;
  }

  // Sanity check: course exists
  const { data: course, error: cErr } = await supabaseAdmin
    .from("courses")
    .select("id,title")
    .eq("id", courseId)
    .maybeSingle();

  if (cErr || !course) {
    return <div className="p-6 text-red-600">Course not found.</div>;
  }

  const initialQuiz: EditorQuiz = {
    course_id: courseId, // REQUIRED for final quiz
    module_id: null, // null => final quiz
    title: "",
    passing_score: 0,
  };

  const initialQuestions: EditorQuestion[] = [];

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Create Final Quiz</h1>
      <QuizEditor
        initialQuiz={initialQuiz}
        initialQuestions={initialQuestions}
        courseId={courseId}
        moduleId={null}
        afterSaveBase="/admin" // stay in admin flow after save
      />
    </main>
  );
}
