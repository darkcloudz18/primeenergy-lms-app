// src/app/api/quizzes/submit-final/route.ts
import { NextResponse } from "next/server";
import { getSupabaseRSC } from "@/lib/supabase-rsc";

type QuestionType = "multiple_choice" | "true_false" | "short_answer";

type AnswerMC = { question_id: string; option_id: string | null };
type AnswerShort = { question_id: string; text: string };
type Answer = AnswerMC | AnswerShort;

type Payload = {
  courseId: string;
  answers: Answer[];
};

type QuizRow = {
  id: string;
  passing_score: number | null;
};

type QuestionRow = {
  id: string;
  type: QuestionType;
};

type OptionRow = {
  id: string;
  question_id: string;
  is_correct: boolean;
};

function isShort(a: Answer): a is AnswerShort {
  return (a as AnswerShort).text !== undefined;
}
function isMC(a: Answer): a is AnswerMC {
  return (a as AnswerMC).option_id !== undefined;
}

export async function POST(req: Request) {
  const supabase = getSupabaseRSC();

  try {
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json()) as Payload | null;
    if (!body?.courseId || !Array.isArray(body.answers)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const { courseId, answers } = body;

    const { data: quizRow, error: quizErr } = await supabase
      .from("quizzes")
      .select("id, passing_score")
      .eq("course_id", courseId)
      .is("module_id", null)
      .maybeSingle<QuizRow>();

    if (quizErr || !quizRow) {
      return NextResponse.json(
        { error: "Final quiz not found" },
        { status: 404 }
      );
    }

    const { data: questionRows, error: qErr } = await supabase
      .from("quiz_questions")
      .select("id, type")
      .eq("quiz_id", quizRow.id);

    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }
    const questions: QuestionRow[] = (questionRows ?? []).map((q) => ({
      id: q.id as string,
      type: q.type as QuestionType,
    }));

    const answerByQuestion = new Map<string, Answer>();
    for (const a of answers) {
      if (a?.question_id) answerByQuestion.set(a.question_id, a);
    }

    const qIds = questions.map((q) => q.id);
    const { data: optionRows, error: oErr } = await supabase
      .from("quiz_options")
      .select("id, question_id, is_correct")
      .in("question_id", qIds);

    if (oErr) {
      return NextResponse.json({ error: oErr.message }, { status: 500 });
    }
    const optionsByQ = new Map<string, OptionRow[]>();
    (optionRows ?? []).forEach((o) => {
      const arr = optionsByQ.get(o.question_id) ?? [];
      arr.push({
        id: o.id as string,
        question_id: o.question_id as string,
        is_correct: !!o.is_correct,
      });
      optionsByQ.set(o.question_id as string, arr);
    });

    // Create attempt
    const { data: attemptRow, error: attemptErr } = await supabase
      .from("quiz_attempts")
      .insert({
        quiz_id: quizRow.id,
        user_id: user.id,
        started_at: new Date().toISOString(),
        score: 0,
        passed: false,
      })
      .select("id")
      .single();

    if (attemptErr || !attemptRow) {
      return NextResponse.json(
        { error: attemptErr?.message ?? "Could not create attempt" },
        { status: 500 }
      );
    }
    const attemptId = attemptRow.id as string;

    // Grade
    let correctCount = 0;

    // (Optional) batch-build rows for question_responses
    const responseRows: Array<{
      attempt_id: string;
      question_id: string;
      selected_option_id?: string | null;
      answer_text?: string;
      is_correct: boolean;
      points_awarded: number;
    }> = [];

    for (const q of questions) {
      const provided = answerByQuestion.get(q.id);

      if (q.type === "short_answer") {
        const text = provided && isShort(provided) ? provided.text : "";
        responseRows.push({
          attempt_id: attemptId,
          question_id: q.id,
          answer_text: text,
          is_correct: false,
          points_awarded: 0,
        });
        continue;
      }

      const selectedId =
        provided && isMC(provided) ? provided.option_id ?? null : null;
      const opts = optionsByQ.get(q.id) ?? [];
      const isCorrect =
        selectedId !== null &&
        opts.some((o) => o.id === selectedId && o.is_correct);

      responseRows.push({
        attempt_id: attemptId,
        question_id: q.id,
        selected_option_id: selectedId,
        is_correct: isCorrect,
        points_awarded: isCorrect ? 1 : 0,
      });

      if (isCorrect) correctCount += 1;
    }

    // INSERT responses in one go (CHANGED)
    if (responseRows.length) {
      const { error: respErr } = await supabase
        .from("question_responses")
        .insert(responseRows);
      if (respErr) {
        return NextResponse.json({ error: respErr.message }, { status: 500 });
      }
    }

    // Finalize attempt
    const passingScore = quizRow.passing_score ?? 0;
    const passed = correctCount >= passingScore;

    const { error: updErr } = await supabase
      .from("quiz_attempts")
      .update({
        finished_at: new Date().toISOString(),
        score: correctCount,
        passed,
      })
      .eq("id", attemptId);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // Return attempt_id so the client can mirror to localStorage (CHANGED)
    return NextResponse.json({
      attempt_id: attemptId, // <-- include this
      score: correctCount,
      passing_score: passingScore,
      passed,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
