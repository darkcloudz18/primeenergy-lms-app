// src/app/admin/courses/edit/[courseId]/final-quiz/[quizId]/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSupabaseRSC } from "@/lib/supabase-rsc";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import QuizEditor, {
  type EditorQuiz,
  type EditorQuestion,
} from "@/components/QuizEditor";

function isAdminRole(role?: string | null) {
  const r = (role ?? "").toLowerCase().trim();
  return r === "admin" || r === "super admin";
}

interface PageProps {
  params: { courseId: string; quizId: string };
}

export default async function AdminFinalQuizEditPage({ params }: PageProps) {
  const { courseId, quizId } = params;

  const sb = getSupabaseRSC();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) return <div className="p-6 text-red-600">Not authenticated.</div>;

  // Require admin (you can allow instructor-owners too if you want)
  const { data: prof } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isAdminRole(prof?.role)) {
    return <div className="p-6 text-red-600">Admins only.</div>;
  }

  // Check course exists (helps with clearer errors/back link)
  const { data: course, error: courseErr } = await supabaseAdmin
    .from("courses")
    .select("id,title")
    .eq("id", courseId)
    .maybeSingle();

  if (courseErr || !course) {
    return <div className="p-6 text-red-600">Course not found.</div>;
  }

  // Load quiz (must be a FINAL quiz → module_id IS NULL and course matches)
  const { data: quizRow, error: qErr } = await supabaseAdmin
    .from("quizzes")
    .select("id,course_id,module_id,title,passing_score")
    .eq("id", quizId)
    .maybeSingle();

  if (
    qErr ||
    !quizRow ||
    quizRow.course_id !== courseId ||
    quizRow.module_id !== null
  ) {
    return <div className="p-6 text-red-600">Final quiz not found.</div>;
  }

  const initialQuiz: EditorQuiz = {
    id: quizRow.id,
    course_id: quizRow.course_id,
    module_id: null,
    title: quizRow.title,
    passing_score: quizRow.passing_score ?? 0,
  };

  // Questions (+ options)
  const { data: qns } = await supabaseAdmin
    .from("quiz_questions")
    .select("id,quiz_id,prompt_html,type,ordering")
    .eq("quiz_id", quizId)
    .order("ordering", { ascending: true });

  const questionIds = (qns ?? []).map((q) => q.id);

  const optsMap = new Map<
    string,
    { id: string; text: string; is_correct: boolean; ordering: number }[]
  >();

  if (questionIds.length) {
    const { data: opts } = await supabaseAdmin
      .from("quiz_options")
      .select("id,question_id,text,is_correct,ordering")
      .in("question_id", questionIds)
      .order("ordering", { ascending: true });

    (opts ?? []).forEach((o) => {
      const arr = optsMap.get(o.question_id) ?? [];
      arr.push({
        id: o.id,
        text: o.text,
        is_correct: !!o.is_correct,
        ordering: o.ordering ?? 1,
      });
      optsMap.set(o.question_id, arr);
    });
  }

  const initialQuestions: EditorQuestion[] = (qns ?? []).map((q) => ({
    id: q.id,
    prompt_html: q.prompt_html ?? "",
    type: q.type as EditorQuestion["type"],
    ordering: q.ordering ?? 1,
    options: optsMap.get(q.id) ?? [],
  }));

  const back = `/admin/courses/edit/${courseId}`;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Final Quiz</h1>
        <Link href={back} className="text-blue-600 hover:underline">
          ← Back to course
        </Link>
      </div>

      <QuizEditor
        initialQuiz={initialQuiz}
        initialQuestions={initialQuestions}
        courseId={courseId}
        moduleId={null}
        afterSaveBase="/admin" // keep admin flow after save
      />
    </main>
  );
}
