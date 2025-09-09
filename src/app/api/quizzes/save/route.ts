import { NextResponse } from "next/server";
import { getSupabaseRSC } from "@/lib/supabase-rsc";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type QType = "multiple_choice" | "true_false" | "short_answer";

export type EditorOption = {
  id?: string;
  text: string;
  is_correct: boolean;
  ordering: number;
};

export type EditorQuestion = {
  id?: string;
  prompt_html: string;
  type: QType;
  ordering: number;
  options: EditorOption[]; // empty for short_answer
};

export type EditorQuiz = {
  id?: string;
  course_id: string;
  module_id?: string | null; // null for final quiz
  title: string;
  passing_score: number;
};

type SaveBody = {
  quiz: EditorQuiz;
  questions: EditorQuestion[];
};

export async function POST(req: Request) {
  try {
    const body: SaveBody = await req.json();

    const sb = getSupabaseRSC();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // (… your existing role/ownership checks …)

    // Upsert quiz
    const upsertQuiz = {
      id: body.quiz.id,
      course_id: body.quiz.course_id,
      module_id: body.quiz.module_id ?? null,
      title: body.quiz.title,
      passing_score: body.quiz.passing_score,
    };

    const { data: quizRow, error: qErr } = await supabaseAdmin
      .from("quizzes")
      .upsert(upsertQuiz, { onConflict: "id" })
      .select("id")
      .single();
    if (qErr || !quizRow) {
      return NextResponse.json(
        { error: qErr?.message || "Quiz save failed" },
        { status: 500 }
      );
    }

    const quizId = quizRow.id as string;

    // Replace questions/options for this quiz
    await supabaseAdmin
      .from("quiz_options")
      .delete()
      .in(
        "question_id",
        (
          (
            await supabaseAdmin
              .from("quiz_questions")
              .select("id")
              .eq("quiz_id", quizId)
          ).data ?? []
        ).map((r) => r.id)
      );
    await supabaseAdmin.from("quiz_questions").delete().eq("quiz_id", quizId);

    const qInserts = body.questions.map((q) => ({
      quiz_id: quizId,
      prompt_html: q.prompt_html,
      type: q.type,
      ordering: q.ordering,
    }));
    const { data: newQs, error: insErr } = await supabaseAdmin
      .from("quiz_questions")
      .insert(qInserts)
      .select("id, ordering");
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // map ordering -> question id so we can insert options
    const byOrdering = new Map<number, string>();
    (newQs ?? []).forEach((r) =>
      byOrdering.set(r.ordering as number, r.id as string)
    );

    const optInserts: {
      question_id: string;
      text: string;
      is_correct: boolean;
      ordering: number;
    }[] = [];
    body.questions.forEach((q) => {
      if (q.type === "short_answer") return;
      const qid = byOrdering.get(q.ordering);
      if (!qid) return;
      q.options.forEach((op) => {
        optInserts.push({
          question_id: qid,
          text: op.text,
          is_correct: !!op.is_correct,
          ordering: op.ordering,
        });
      });
    });
    if (optInserts.length > 0) {
      const { error: optErr } = await supabaseAdmin
        .from("quiz_options")
        .insert(optInserts);
      if (optErr) {
        return NextResponse.json({ error: optErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      quiz: { id: quizId },
      questions: body.questions,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
