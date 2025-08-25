// src/app/api/courses/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// ---------- Types ----------
type OptionInput = { text: string; is_correct: boolean };
type QuestionInput = {
  prompt_html: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  options: OptionInput[];
};
type QuizInput = {
  title: string;
  description: string;
  passing_score: number;
  questions: QuestionInput[];
};
type LessonInput = {
  title: string;
  content: string;
  type: "article" | "video" | "image";
  ordering: number;
  imageUrl: string | null;
};
type ModuleInput = {
  title: string;
  ordering: number;
  lessons: LessonInput[];
  quiz?: QuizInput | null;
};
type CreateCoursePayload = {
  title: string;
  description: string;
  imageUrl: string | null;
  category: string;
  tag: string;
  level: string;
  modules?: ModuleInput[];
  finalQuiz?: QuizInput | null;
};

// ---------- GET ----------
export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      "id, title, description, image_url, category, level, tag, created_at"
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ courses: data });
}

// ---------- Helpers ----------
function hasAtLeastOneQuestion(q?: QuizInput | null) {
  return !!q && Array.isArray(q.questions) && q.questions.length > 0;
}

async function createModuleQuiz(
  supabase: ReturnType<typeof createServerClient>,
  moduleId: string,
  quiz: QuizInput
) {
  // Only include module_id key; DO NOT include course_id at all.
  const { data: quizRow, error: quizErr } = await supabase
    .from("quizzes")
    .insert([
      {
        module_id: moduleId,
        title: quiz.title,
        description: quiz.description || null,
        passing_score: quiz.passing_score,
      },
    ])
    .select("id")
    .single();
  if (quizErr || !quizRow)
    throw new Error(quizErr?.message ?? "Failed to create module quiz");
  const quizId = quizRow.id;

  // Insert questions & options
  for (const [qi, q] of quiz.questions.entries()) {
    const { data: qRow, error: qErr } = await supabase
      .from("quiz_questions")
      .insert([
        {
          quiz_id: quizId,
          prompt_html: q.prompt_html,
          type: q.type, // DB column is `type`
          ordering: qi + 1,
        },
      ])
      .select("id")
      .single();
    if (qErr || !qRow)
      throw new Error(qErr?.message ?? "Failed to create question");

    if (q.type === "multiple_choice" || q.type === "true_false") {
      const optionsPayload = q.options.map((opt, idx) => ({
        question_id: qRow.id,
        text: opt.text,
        is_correct: opt.is_correct,
        ordering: idx + 1,
      }));
      if (optionsPayload.length) {
        const { error: optErr } = await supabase
          .from("quiz_options")
          .insert(optionsPayload);
        if (optErr) throw new Error(optErr.message);
      }
    }
  }
}

async function createFinalQuiz(
  supabase: ReturnType<typeof createServerClient>,
  courseId: string,
  quiz: QuizInput
) {
  // Only include course_id key; DO NOT include module_id at all.
  const { data: quizRow, error: quizErr } = await supabase
    .from("quizzes")
    .insert([
      {
        course_id: courseId,
        title: quiz.title,
        description: quiz.description || null,
        passing_score: quiz.passing_score,
      },
    ])
    .select("id")
    .single();
  if (quizErr || !quizRow)
    throw new Error(quizErr?.message ?? "Failed to create final quiz");
  const quizId = quizRow.id;

  for (const [qi, q] of quiz.questions.entries()) {
    const { data: qRow, error: qErr } = await supabase
      .from("quiz_questions")
      .insert([
        {
          quiz_id: quizId,
          prompt_html: q.prompt_html,
          type: q.type,
          ordering: qi + 1,
        },
      ])
      .select("id")
      .single();
    if (qErr || !qRow)
      throw new Error(qErr?.message ?? "Failed to create question");

    if (q.type === "multiple_choice" || q.type === "true_false") {
      const optionsPayload = q.options.map((opt, idx) => ({
        question_id: qRow.id,
        text: opt.text,
        is_correct: opt.is_correct,
        ordering: idx + 1,
      }));
      if (optionsPayload.length) {
        const { error: optErr } = await supabase
          .from("quiz_options")
          .insert(optionsPayload);
        if (optErr) throw new Error(optErr.message);
      }
    }
  }
}

// ---------- POST ----------
export async function POST(request: Request) {
  const supabase = createServerClient();

  try {
    // Auth
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Role check
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profErr || !prof || !["tutor", "admin"].includes(prof.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Payload
    const body = (await request.json()) as CreateCoursePayload;
    const {
      title,
      description,
      imageUrl,
      category,
      tag,
      level,
      modules = [],
      finalQuiz = null,
    } = body;

    // 1) Course
    const { data: courseRow, error: courseError } = await supabase
      .from("courses")
      .insert([
        {
          title,
          description,
          image_url: imageUrl ?? null,
          category,
          tag,
          level,
          instructor_id: user.id, // RLS requires owner/admin
        },
      ])
      .select("id")
      .single();
    if (courseError || !courseRow) {
      return NextResponse.json(
        { error: courseError?.message ?? "Create course failed" },
        { status: 500 }
      );
    }
    const newCourseId = courseRow.id;

    // 2) Modules, lessons, module quizzes
    for (const mod of modules) {
      // a) module
      const { data: modRow, error: modError } = await supabase
        .from("modules")
        .insert([
          { course_id: newCourseId, title: mod.title, ordering: mod.ordering },
        ])
        .select("id")
        .single();
      if (modError || !modRow) {
        return NextResponse.json(
          { error: modError?.message ?? "Create module failed" },
          { status: 500 }
        );
      }
      const newModuleId = modRow.id;

      // b) lessons
      if (mod.lessons?.length) {
        const lessonPayload = mod.lessons.map((l) => ({
          module_id: newModuleId,
          title: l.title,
          content: l.content,
          type: l.type,
          ordering: l.ordering,
          image_url: l.imageUrl ?? null,
        }));
        const { error: lessonsErr } = await supabase
          .from("lessons")
          .insert(lessonPayload);
        if (lessonsErr) {
          return NextResponse.json(
            { error: lessonsErr.message },
            { status: 500 }
          );
        }
      }

      // c) module quiz (only if it actually has questions)
      if (hasAtLeastOneQuestion(mod.quiz)) {
        await createModuleQuiz(supabase, newModuleId, mod.quiz as QuizInput);
      }
    }

    // 3) Final quiz (only if it actually has questions)
    if (hasAtLeastOneQuestion(finalQuiz)) {
      await createFinalQuiz(supabase, newCourseId, finalQuiz as QuizInput);
    }

    return NextResponse.json({ id: newCourseId });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
        ? err
        : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
