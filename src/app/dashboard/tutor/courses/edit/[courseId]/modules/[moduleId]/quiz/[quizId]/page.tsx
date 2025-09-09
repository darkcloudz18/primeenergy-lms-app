export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSupabaseRSC } from "@/lib/supabase-rsc";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import QuizEditor, {
  EditorQuiz,
  EditorQuestion,
} from "@/components/QuizEditor";

type QType = "multiple_choice" | "true_false" | "short_answer";

type QuestionRow = {
  id: string;
  prompt_html: string | null;
  type: QType | null;
  ordering: number | null;
};

type OptionRow = {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean | null;
  ordering: number | null;
};

function isAdminRole(role?: string | null) {
  const r = (role ?? "").toLowerCase().trim();
  return r === "admin" || r === "super admin";
}

interface PageProps {
  params: { courseId: string; moduleId: string; quizId: string };
}

export default async function TutorModuleQuizEdit({ params }: PageProps) {
  const { courseId, moduleId, quizId } = params;

  const sb = getSupabaseRSC();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return <div className="p-6 text-red-600">Not authenticated.</div>;

  // Validate module belongs to the course
  const { data: mod } = await supabaseAdmin
    .from("modules")
    .select("id, course_id, title")
    .eq("id", moduleId)
    .maybeSingle();

  if (!mod || mod.course_id !== courseId) {
    return <div className="p-6 text-red-600">Module not found.</div>;
  }

  // Role / ownership
  let isAdmin = false;
  {
    const { data: prof } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = isAdminRole(prof?.role);
  }
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("instructor_id")
    .eq("id", courseId)
    .maybeSingle();
  const isOwner = course?.instructor_id === user.id;
  if (!isAdmin && !isOwner) {
    return <div className="p-6 text-red-600">Forbidden.</div>;
  }

  // Fetch quiz by id + module_id ONLY
  const { data: quizRow, error: qErr } = await supabaseAdmin
    .from("quizzes")
    .select("id, module_id, title, passing_score, description")
    .eq("id", quizId)
    .eq("module_id", moduleId)
    .maybeSingle();

  if (qErr || !quizRow) {
    return <div className="p-6 text-red-600">Module quiz not found.</div>;
  }

  const initialQuiz: EditorQuiz = {
    id: quizRow.id,
    course_id: courseId, // for redirects; not used to find module quiz
    module_id: moduleId,
    title: quizRow.title,
    passing_score: quizRow.passing_score ?? 0,
    description: quizRow.description ?? "",
  };

  // Questions
  const { data: qns } = await supabaseAdmin
    .from("quiz_questions")
    .select("id, prompt_html, type, ordering")
    .eq("quiz_id", quizId)
    .order("ordering", { ascending: true });

  const questionsRows: QuestionRow[] = (qns ?? []) as QuestionRow[];
  const questionIds = questionsRows.map((q) => q.id);

  // Options (typed fallback, no `any`)
  let optionsRows: OptionRow[] = [];
  if (questionIds.length) {
    const { data: opts } = await supabaseAdmin
      .from("quiz_options")
      .select("id, question_id, text, is_correct, ordering")
      .in("question_id", questionIds)
      .order("ordering", { ascending: true });

    optionsRows = (opts ?? []) as OptionRow[];
  }

  const optsByQ = new Map<string, OptionRow[]>();
  optionsRows.forEach((o) => {
    const arr = optsByQ.get(o.question_id) ?? [];
    arr.push(o);
    optsByQ.set(o.question_id, arr);
  });

  const initialQuestions: EditorQuestion[] = questionsRows.map((q) => ({
    id: q.id,
    prompt_html: q.prompt_html ?? "",
    type: (q.type ?? "multiple_choice") as QType,
    ordering: q.ordering ?? 1,
    options: (optsByQ.get(q.id) ?? []).map((o) => ({
      id: o.id,
      text: o.text,
      is_correct: !!o.is_correct,
      ordering: o.ordering ?? 1,
    })),
  }));

  const back = `/dashboard/tutor/courses/edit/${courseId}`;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Edit Module Quiz — {mod.title}
        </h1>
        <Link href={back} className="text-blue-600 hover:underline">
          ← Back
        </Link>
      </div>

      <QuizEditor
        initialQuiz={initialQuiz}
        initialQuestions={initialQuestions}
        courseId={courseId}
        moduleId={moduleId}
      />
    </main>
  );
}
