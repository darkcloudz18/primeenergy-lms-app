// src/app/api/courses/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

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

export async function POST(request: Request) {
  const {
    title,
    description,
    imageUrl,
    category,
    tag,
    level,
    modules,
    finalQuiz,
  } = (await request.json()) as {
    title: string;
    description: string;
    imageUrl: string | null;
    category: string;
    tag: string;
    level: string;
    modules: Array<{
      title: string;
      ordering: number;
      lessons: Array<{
        title: string;
        content: string;
        type: "article" | "video" | "image";
        ordering: number;
        imageUrl: string | null;
      }>;
      quiz?: {
        title: string;
        description: string;
        passing_score: number;
        questions: Array<{
          prompt_html: string;
          type: "multiple_choice" | "true_false" | "short_answer";
          options: Array<{ text: string; is_correct: boolean }>;
        }>;
      };
    }>;
    finalQuiz?: {
      title: string;
      description: string;
      passing_score: number;
      questions: Array<{
        prompt_html: string;
        type: "multiple_choice" | "true_false" | "short_answer";
        options: Array<{ text: string; is_correct: boolean }>;
      }>;
    };
  };

  const supabase = createServerClient();

  // 1️⃣ Insert course
  const safeImageUrl = imageUrl ?? "";
  const { data: courseRow, error: courseError } = await supabase
    .from("courses")
    .insert({
      title,
      description,
      image_url: safeImageUrl, // never null now
      category,
      tag,
      level,
    })
    .select("id")
    .single();

  if (courseError) {
    return NextResponse.json({ error: courseError.message }, { status: 500 });
  }
  const newCourseId = courseRow.id;

  // 2️⃣ Loop each module, insert it, then its lessons, then optional quiz
  for (const modInputs of modules) {
    // a) Create module row
    const { data: modRow, error: modError } = await supabase
      .from("modules")
      .insert({
        course_id: newCourseId,
        title: modInputs.title,
        ordering: modInputs.ordering,
      })
      .select("id")
      .single();

    if (modError) {
      return NextResponse.json({ error: modError.message }, { status: 500 });
    }
    const newModuleId = modRow.id;

    // b) Insert lessons under that module
    for (const lessonInputs of modInputs.lessons) {
      const { error: lessonError } = await supabase.from("lessons").insert({
        module_id: newModuleId,
        title: lessonInputs.title,
        content: lessonInputs.content,
        type: lessonInputs.type,
        ordering: lessonInputs.ordering,
        image_url: lessonInputs.imageUrl,
      });
      if (lessonError) {
        return NextResponse.json(
          { error: lessonError.message },
          { status: 500 }
        );
      }
    }

    // c) If this module has a quiz block, insert into quizzes → questions → options
    if (modInputs.quiz) {
      // i) insert quiz row
      const { data: quizRow, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          module_id: newModuleId,
          course_id: null,
          title: modInputs.quiz.title,
          description: modInputs.quiz.description,
          passing_score: modInputs.quiz.passing_score,
        })
        .select("id")
        .single();

      if (quizError) {
        return NextResponse.json({ error: quizError.message }, { status: 500 });
      }
      const newQuizId = quizRow.id;

      // ii) Insert each question
      for (const qInput of modInputs.quiz.questions) {
        const { data: qRow, error: qError } = await supabase
          .from("quiz_questions")
          .insert({
            quiz_id: newQuizId,
            prompt_html: qInput.prompt_html,
            type: qInput.type,
            ordering: 1,
          })
          .select("id")
          .single();

        if (qError) {
          return NextResponse.json({ error: qError.message }, { status: 500 });
        }
        const newQuestionId = qRow.id;

        // iii) Insert options if needed
        if (qInput.type === "multiple_choice" || qInput.type === "true_false") {
          for (const [optIdx, optInput] of qInput.options.entries()) {
            const { error: optError } = await supabase
              .from("quiz_options")
              .insert({
                question_id: newQuestionId,
                text: optInput.text,
                is_correct: optInput.is_correct,
                ordering: optIdx + 1,
              });
            if (optError) {
              return NextResponse.json(
                { error: optError.message },
                { status: 500 }
              );
            }
          }
        }
      }
    }
  }

  // 3️⃣ Insert final quiz (if provided)
  if (finalQuiz) {
    const { data: finalQuizRow, error: fError } = await supabase
      .from("quizzes")
      .insert({
        course_id: newCourseId,
        module_id: null,
        title: finalQuiz.title,
        description: finalQuiz.description,
        passing_score: finalQuiz.passing_score,
      })
      .select("id")
      .single();

    if (fError) {
      return NextResponse.json({ error: fError.message }, { status: 500 });
    }
    const finalQuizId = finalQuizRow.id;

    // Insert its questions & options
    for (const qInput of finalQuiz.questions) {
      const { data: qRow, error: qError } = await supabase
        .from("quiz_questions")
        .insert({
          quiz_id: finalQuizId,
          prompt_html: qInput.prompt_html,
          type: qInput.type,
          ordering: 1,
        })
        .select("id")
        .single();

      if (qError) {
        return NextResponse.json({ error: qError.message }, { status: 500 });
      }
      const newQuestionId = qRow.id;

      if (qInput.type === "multiple_choice" || qInput.type === "true_false") {
        for (const [optIdx, optInput] of qInput.options.entries()) {
          const { error: optError } = await supabase
            .from("quiz_options")
            .insert({
              question_id: newQuestionId,
              text: optInput.text,
              is_correct: optInput.is_correct,
              ordering: optIdx + 1,
            });
          if (optError) {
            return NextResponse.json(
              { error: optError.message },
              { status: 500 }
            );
          }
        }
      }
    }
  }

  // 4️⃣ Return the newly created course ID
  return NextResponse.json({ id: newCourseId });
}
