// src/app/api/courses/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// ---------- Types for the request payload ----------
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

// ---------- GET (unchanged) ----------
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

// ---------- POST (create course) ----------
export async function POST(request: Request) {
  const supabase = createServerClient();

  // Who’s calling?
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Only tutors/admins can create courses
  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profErr || !prof || !["tutor", "admin"].includes(prof.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse + validate body
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

  // 1) Insert course (RLS requires instructor_id = auth.uid())
  const { data: courseRow, error: courseError } = await supabase
    .from("courses")
    .insert({
      title,
      description,
      image_url: imageUrl ?? "",
      category,
      tag,
      level,
      instructor_id: user.id,
    })
    .select("id")
    .single();

  if (courseError) {
    return NextResponse.json({ error: courseError.message }, { status: 500 });
  }
  const newCourseId = courseRow.id;

  // 2) Insert modules → lessons → optional module quiz
  for (const mod of modules) {
    // a) module
    const { data: modRow, error: modError } = await supabase
      .from("modules")
      .insert({
        course_id: newCourseId,
        title: mod.title,
        ordering: mod.ordering,
      })
      .select("id")
      .single();

    if (modError) {
      return NextResponse.json({ error: modError.message }, { status: 500 });
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
        image_url: l.imageUrl,
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

    // c) module-level quiz (optional)
    if (mod.quiz) {
      const qz = mod.quiz;

      const { data: quizRow, error: quizErr } = await supabase
        .from("quizzes")
        .insert({
          module_id: newModuleId,
          course_id: null,
          title: qz.title,
          description: qz.description,
          passing_score: qz.passing_score,
        })
        .select("id")
        .single();

      if (quizErr) {
        return NextResponse.json({ error: quizErr.message }, { status: 500 });
      }
      const quizId = quizRow.id;

      // questions
      for (const [qi, q] of qz.questions.entries()) {
        const { data: qRow, error: qErr } = await supabase
          .from("quiz_questions")
          .insert({
            quiz_id: quizId,
            prompt_html: q.prompt_html,
            type: q.type,
            ordering: qi + 1,
          })
          .select("id")
          .single();

        if (qErr) {
          return NextResponse.json({ error: qErr.message }, { status: 500 });
        }
        const questionId = qRow.id;

        // options (only for MC/TF)
        if (q.type === "multiple_choice" || q.type === "true_false") {
          const optionsPayload = q.options.map((opt, idx) => ({
            question_id: questionId,
            text: opt.text,
            is_correct: opt.is_correct,
            ordering: idx + 1,
          }));
          const { error: optErr } = await supabase
            .from("quiz_options")
            .insert(optionsPayload);
          if (optErr) {
            return NextResponse.json(
              { error: optErr.message },
              { status: 500 }
            );
          }
        }
      }
    }
  }

  // 3) Final course quiz (optional)
  if (finalQuiz) {
    const fq = finalQuiz;

    const { data: fqRow, error: fqErr } = await supabase
      .from("quizzes")
      .insert({
        course_id: newCourseId,
        module_id: null,
        title: fq.title,
        description: fq.description,
        passing_score: fq.passing_score,
      })
      .select("id")
      .single();

    if (fqErr) {
      return NextResponse.json({ error: fqErr.message }, { status: 500 });
    }
    const finalQuizId = fqRow.id;

    for (const [qi, q] of fq.questions.entries()) {
      const { data: qRow, error: qErr } = await supabase
        .from("quiz_questions")
        .insert({
          quiz_id: finalQuizId,
          prompt_html: q.prompt_html,
          type: q.type,
          ordering: qi + 1,
        })
        .select("id")
        .single();

      if (qErr) {
        return NextResponse.json({ error: qErr.message }, { status: 500 });
      }
      const questionId = qRow.id;

      if (q.type === "multiple_choice" || q.type === "true_false") {
        const optionsPayload = q.options.map((opt, idx) => ({
          question_id: questionId,
          text: opt.text,
          is_correct: opt.is_correct,
          ordering: idx + 1,
        }));
        const { error: optErr } = await supabase
          .from("quiz_options")
          .insert(optionsPayload);
        if (optErr) {
          return NextResponse.json({ error: optErr.message }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json({ id: newCourseId });
}
