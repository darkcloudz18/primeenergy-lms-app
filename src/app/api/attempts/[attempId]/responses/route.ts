// src/app/api/attempts/[attemptId]/responses/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

type AnswerPayload = {
  question_id: string;
  selected_option_id?: string;
  answer_text?: string;
};

export async function POST(
  req: Request,
  { params }: { params: { attemptId: string } }
) {
  const { attemptId } = params;
  const answers: AnswerPayload[] = await req.json();
  const supabase = createServerClient();

  // 1) Insert all responses
  const insertPayload = answers.map((a) => ({
    attempt_id: attemptId,
    question_id: a.question_id,
    selected_option_id: a.selected_option_id,
    answer_text: a.answer_text,
  }));
  const { error: respErr } = await supabase
    .from("question_responses")
    .insert(insertPayload);
  if (respErr) {
    return NextResponse.json({ error: respErr.message }, { status: 500 });
  }

  // 2) Load the existing attempt to get quiz_id
  const { data: attemptRow, error: atErr } = await supabase
    .from("quiz_attempts")
    .select("quiz_id")
    .eq("id", attemptId)
    .single();
  if (atErr || !attemptRow) {
    return NextResponse.json(
      { error: "Attempt not found or could not load quiz_id" },
      { status: 404 }
    );
  }

  // 3) Load passing_score for that quiz
  const { data: quizRow, error: qErr } = await supabase
    .from("quizzes")
    .select("passing_score")
    .eq("id", attemptRow.quiz_id)
    .single();
  if (qErr || !quizRow) {
    return NextResponse.json(
      { error: "Quiz not found or could not load passing_score" },
      { status: 404 }
    );
  }

  // 4) Fetch all correct option IDs for the answered questions
  const questionIds = answers.map((a) => a.question_id);
  const { data: correctOpts, error: coErr } = await supabase
    .from("options")
    .select("question_id, id")
    .in("question_id", questionIds)
    .eq("is_correct", true);
  if (coErr) {
    return NextResponse.json({ error: coErr.message }, { status: 500 });
  }

  const correctMap = new Map<string, string[]>();
  correctOpts.forEach((o) => {
    if (!correctMap.has(o.question_id)) correctMap.set(o.question_id, []);
    correctMap.get(o.question_id)!.push(o.id);
  });

  // 5) Score each answer (1 point per correct)
  let totalScore = 0;
  const scoredResponses = answers.map((a) => {
    const correctIds = correctMap.get(a.question_id) || [];
    const isCorrect =
      a.selected_option_id != null && correctIds.includes(a.selected_option_id);
    if (isCorrect) totalScore++;
    return {
      attempt_id: attemptId,
      question_id: a.question_id,
      selected_option_id: a.selected_option_id,
      answer_text: a.answer_text,
      is_correct: isCorrect,
      score_awarded: isCorrect ? 1 : 0,
    };
  });

  // 6) (Optional) Update each response row with is_correct & score_awarded
  //    If you included those columns in your insert, skip this step.
  await supabase
    .from("question_responses")
    .upsert(scoredResponses, { onConflict: "attempt_id,question_id" });
  // 7) Mark attempt finished & record score & passed flag
  const passed = totalScore >= quizRow.passing_score;
  const { error: updErr } = await supabase
    .from("quiz_attempts")
    .update({
      finished_at: new Date().toISOString(),
      total_score: totalScore,
      passed,
    })
    .eq("id", attemptId);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // 8) If passed, issue certificate
  if (passed) {
    await supabase.from("certificates_issued").insert({
      attempt_id: attemptId,
      issued_at: new Date().toISOString(),
      // certificate_url: ... generate or store your URL here
    });
  }

  return NextResponse.json({
    attemptId,
    total_score: totalScore,
    passed,
  });
}
