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
  params: { courseId: string; quizId: string };
}

export default async function TutorFinalQuizEditPage({ params }: PageProps) {
  const { courseId, quizId } = params;
  const sb = getSupabaseRSC();

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return <div className="p-6 text-red-600">Not authenticated.</div>;

  // verify course and ownership
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("id,instructor_id,title")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) return <div className="p-6 text-red-600">Course not found.</div>;

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

  // load quiz (must be final => module_id null and course match)
  const { data: quizRow, error: qErr } = await supabaseAdmin
    .from("quizzes")
    .select("id,course_id,module_id,title,description,passing_score")
    .eq("id", quizId)
    .single();

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

  // load questions + options
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
    type: (q.type as EditorQuestion["type"]) ?? "multiple_choice",
    ordering: q.ordering ?? 1,
    options: optsMap.get(q.id) ?? [],
  }));

  const back = `/dashboard/tutor/courses/edit/${courseId}`;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Final Quiz</h1>
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
