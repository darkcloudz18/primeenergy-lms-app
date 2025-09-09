// src/app/api/admin/quizzes/save/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type QType = "multiple_choice" | "true_false" | "short_answer";

type OptionInput = {
  text: string;
  is_correct: boolean;
  ordering: number;
};

type QuestionInput = {
  prompt_html: string;
  type: QType;
  ordering: number;
  options: OptionInput[];
};

type QuizInput = {
  id?: string;
  course_id?: string | null; // present for final quiz (module_id null)
  module_id?: string | null; // present for module quiz (course_id null)
  title: string;
  description?: string | null;
  passing_score?: number | null;
};

type SaveRequest = {
  quiz: QuizInput;
  questions: QuestionInput[];
};

type SaveResponse =
  | { quiz: { id: string }; questions: QuestionInput[] }
  | { error: string };

export async function POST(req: Request) {
  // ---- Parse JSON safely ----
  let body: SaveRequest;
  try {
    body = (await req.json()) as SaveRequest;
  } catch {
    return NextResponse.json<SaveResponse>(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const q = body.quiz;
  if (!q || !q.title) {
    return NextResponse.json<SaveResponse>(
      { error: "Missing required fields (title)" },
      { status: 400 }
    );
  }

  const isModuleQuiz = !!q.module_id;
  let courseId: string | null = q.course_id ?? null;

  // Enforce the one-parent rule: a quiz belongs to EITHER a course OR a module
  if (isModuleQuiz) {
    // Derive course_id from the module for validation, but DO NOT store it
    const { data: mod, error: modErr } = await supabaseAdmin
      .from("modules")
      .select("course_id")
      .eq("id", q.module_id)
      .maybeSingle();
    if (modErr) {
      return NextResponse.json<SaveResponse>(
        { error: modErr.message },
        { status: 500 }
      );
    }
    if (!mod?.course_id) {
      return NextResponse.json<SaveResponse>(
        { error: "Invalid module_id" },
        { status: 400 }
      );
    }
    courseId = mod.course_id;
  } else {
    // Final quiz must have a course_id
    if (!courseId) {
      return NextResponse.json<SaveResponse>(
        { error: "Missing required fields (course_id, title)" },
        { status: 400 }
      );
    }
  }

  const row = {
    title: q.title,
    description: q.description ?? null,
    passing_score: q.passing_score ?? null,
    course_id: isModuleQuiz ? null : courseId, // exactly one parent set
    module_id: isModuleQuiz ? q.module_id! : null, // the other is null
  };

  // ---- Create/Update quiz ----
  let quizId = q.id ?? null;
  if (quizId) {
    const { error } = await supabaseAdmin
      .from("quizzes")
      .update(row)
      .eq("id", quizId);
    if (error) {
      return NextResponse.json<SaveResponse>(
        { error: error.message },
        { status: 500 }
      );
    }
  } else {
    const { data: ins, error } = await supabaseAdmin
      .from("quizzes")
      .insert(row)
      .select("id")
      .single();
    if (error || !ins) {
      return NextResponse.json<SaveResponse>(
        { error: error?.message ?? "Insert failed" },
        { status: 500 }
      );
    }
    quizId = ins.id as string;
  }

  // ---- Replace questions/options ----
  // 1) Get existing question IDs (to delete options first)
  const { data: existingQs, error: eqErr } = await supabaseAdmin
    .from("quiz_questions")
    .select("id")
    .eq("quiz_id", quizId);
  if (eqErr) {
    return NextResponse.json<SaveResponse>(
      { error: eqErr.message },
      { status: 500 }
    );
  }
  const existingIds = (existingQs ?? []).map((r) => r.id as string);

  if (existingIds.length > 0) {
    const { error: delOptsErr } = await supabaseAdmin
      .from("quiz_options")
      .delete()
      .in("question_id", existingIds);
    if (delOptsErr) {
      return NextResponse.json<SaveResponse>(
        { error: delOptsErr.message },
        { status: 500 }
      );
    }
    const { error: delQsErr } = await supabaseAdmin
      .from("quiz_questions")
      .delete()
      .eq("quiz_id", quizId);
    if (delQsErr) {
      return NextResponse.json<SaveResponse>(
        { error: delQsErr.message },
        { status: 500 }
      );
    }
  }

  // 2) Insert new questions
  const qInserts = (body.questions ?? []).map((qu) => ({
    quiz_id: quizId!,
    prompt_html: qu.prompt_html ?? "",
    type: qu.type,
    ordering: qu.ordering,
  }));

  const orderingToId = new Map<number, string>();
  if (qInserts.length > 0) {
    const { data: newQs, error: insErr } = await supabaseAdmin
      .from("quiz_questions")
      .insert(qInserts)
      .select("id, ordering")
      .order("ordering", { ascending: true });
    if (insErr) {
      return NextResponse.json<SaveResponse>(
        { error: insErr.message },
        { status: 500 }
      );
    }
    (newQs ?? []).forEach((r) =>
      orderingToId.set((r.ordering as number) ?? 0, r.id as string)
    );
  }

  // 3) Insert options for non-short_answer questions
  const optInserts: {
    question_id: string;
    text: string;
    is_correct: boolean;
    ordering: number;
  }[] = [];

  for (const qu of body.questions ?? []) {
    if (qu.type === "short_answer") continue;
    const qid = orderingToId.get(qu.ordering);
    if (!qid) continue;
    for (const op of qu.options ?? []) {
      optInserts.push({
        question_id: qid,
        text: op.text,
        is_correct: !!op.is_correct,
        ordering: op.ordering,
      });
    }
  }

  if (optInserts.length > 0) {
    const { error: optErr } = await supabaseAdmin
      .from("quiz_options")
      .insert(optInserts);
    if (optErr) {
      return NextResponse.json<SaveResponse>(
        { error: optErr.message },
        { status: 500 }
      );
    }
  }

  // 4) Always return JSON
  return NextResponse.json<SaveResponse>({
    quiz: { id: quizId! },
    questions: body.questions ?? [],
  });
}
