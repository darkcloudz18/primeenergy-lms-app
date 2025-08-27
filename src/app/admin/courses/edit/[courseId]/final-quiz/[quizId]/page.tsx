import { supabaseAdmin } from "@/lib/supabaseAdmin";
import QuizEditor, {
  type EditorQuiz,
  type EditorQuestion,
  type EditorOption,
} from "../../quiz/[quizId]/QuizEditor";

type PageProps = {
  params: {
    courseId: string;
    quizId: string;
  };
};

type DBQuiz = {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  passing_score: number | null;
};

type DBQuestion = {
  id: string;
  quiz_id: string;
  prompt_html: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  ordering: number | null;
};

type DBOption = {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean | null;
  ordering: number | null;
};

export default async function EditFinalQuizPage({ params }: PageProps) {
  const { courseId, quizId } = params;

  // 1) Load the final quiz (module_id must be null)
  const { data: qz, error: qzErr } = await supabaseAdmin
    .from("quizzes")
    .select("id, course_id, module_id, title, passing_score")
    .eq("id", quizId)
    .is("module_id", null)
    .single();

  if (qzErr || !qz) {
    return (
      <div className="p-6">
        <p className="text-red-600">
          Error loading final quiz{qzErr ? `: ${qzErr.message}` : ""}
        </p>
      </div>
    );
  }

  const quiz = qz as DBQuiz;

  // 2) Load questions
  const { data: qRows, error: qErr } = await supabaseAdmin
    .from("quiz_questions")
    .select("id, quiz_id, prompt_html, type, ordering")
    .eq("quiz_id", quiz.id)
    .order("ordering", { ascending: true });

  if (qErr) {
    return (
      <div className="p-6">
        <p className="text-red-600">Error loading questions: {qErr.message}</p>
      </div>
    );
  }

  const questions = (qRows ?? []) as DBQuestion[];
  const qIds = questions.map((q) => q.id);

  // 3) Load options for those questions
  const { data: oRows, error: oErr } = await supabaseAdmin
    .from("quiz_options")
    .select("id, question_id, text, is_correct, ordering")
    .in("question_id", qIds);

  if (oErr) {
    return (
      <div className="p-6">
        <p className="text-red-600">Error loading options: {oErr.message}</p>
      </div>
    );
  }

  const options = (oRows ?? []) as DBOption[];
  const optionsByQ = new Map<string, DBOption[]>();
  for (const op of options) {
    const arr = optionsByQ.get(op.question_id) ?? [];
    arr.push(op);
    optionsByQ.set(op.question_id, arr);
  }

  // 4) Map DB → Editor shapes
  const initialQuiz: EditorQuiz = {
    id: quiz.id,
    course_id: quiz.course_id,
    module_id: null, // final quiz
    title: quiz.title ?? "",
    passing_score: quiz.passing_score ?? 0,
  };

  const initialQuestions: EditorQuestion[] = questions.map((q) => {
    const base: EditorQuestion = {
      id: q.id,
      prompt_html: q.prompt_html ?? "",
      type: q.type,
      ordering: q.ordering ?? 0,
      options: [],
    };
    if (q.type !== "short_answer") {
      const ops = (optionsByQ.get(q.id) ?? [])
        .slice()
        .sort((a, b) => (a.ordering ?? 0) - (b.ordering ?? 0))
        .map<EditorOption>((op) => ({
          id: op.id,
          text: op.text ?? "",
          is_correct: !!op.is_correct,
          ordering: op.ordering ?? 0,
        }));
      base.options = ops;
    }
    return base;
  });

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Edit Final Quiz</h1>
      <QuizEditor
        initialQuiz={initialQuiz}
        initialQuestions={initialQuestions}
      />
    </main>
  );
}
