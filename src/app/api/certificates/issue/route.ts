import { NextResponse } from "next/server";
import { getSupabaseRSC } from "@/lib/supabase-rsc";

// adjust these if your table/logic differs
async function hasFinishedCourse(
  supabase: ReturnType<typeof getSupabaseRSC>,
  userId: string,
  courseId: string
) {
  // 1) all lessons in course
  const { data: modules, error: modErr } = await supabase
    .from("modules")
    .select("id")
    .eq("course_id", courseId);

  if (modErr) throw new Error(modErr.message);

  const moduleIds = (modules ?? []).map((m) => m.id);
  if (moduleIds.length === 0) return false;

  const { data: lessons, error: lesErr } = await supabase
    .from("lessons")
    .select("id, module_id")
    .in("module_id", moduleIds);

  if (lesErr) throw new Error(lesErr.message);

  const lessonIds = (lessons ?? []).map((l) => l.id);

  // 2) user completed all lessons?
  const { data: comps, error: compErr } = await supabase
    .from("lesson_completions") // <- change if your table uses a different name
    .select("lesson_id")
    .eq("user_id", userId)
    .in("lesson_id", lessonIds);

  if (compErr) throw new Error(compErr.message);

  const completedCount = (comps ?? []).length;
  const allLessonsDone =
    lessonIds.length > 0 && completedCount === lessonIds.length;

  // 3) final quiz passed? (optional)
  //   Adjust these names if your schema differs.
  const { data: finalQuiz, error: fqErr } = await supabase
    .from("quizzes")
    .select("id")
    .eq("course_id", courseId)
    .is("module_id", null)
    .maybeSingle();

  if (fqErr) throw new Error(fqErr.message);

  let finalPassed = true;
  if (finalQuiz?.id) {
    // We assume a table quiz_attempts (user_id, quiz_id, passed boolean)
    const { data: attempt, error: attErr } = await supabase
      .from("quiz_attempts")
      .select("passed")
      .eq("user_id", userId)
      .eq("quiz_id", finalQuiz.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (attErr) throw new Error(attErr.message);
    finalPassed = Boolean(attempt?.passed);
  }

  return allLessonsDone && finalPassed;
}

export async function POST(req: Request) {
  const supabase = getSupabaseRSC();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { courseId } = (await req.json()) as { courseId: string };
  if (!courseId) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 });
  }

  // check completion
  const done = await hasFinishedCourse(supabase, user.id, courseId);
  if (!done) {
    return NextResponse.json(
      { error: "Course not fully completed" },
      { status: 400 }
    );
  }

  // get active template
  const { data: tmpl, error: tErr } = await supabase
    .from("certificate_templates")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }
  if (!tmpl) {
    return NextResponse.json(
      { error: "No active certificate template" },
      { status: 400 }
    );
  }

  // upsert (unique(user_id, course_id))
  const { data: cert, error: cErr } = await supabase
    .from("certificates")
    .insert({ user_id: user.id, course_id: courseId, template_id: tmpl.id })
    .select("id")
    .maybeSingle();

  if (cErr && !cErr.message.includes("duplicate key")) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  // fetch existing if duplicate
  let certificateId = cert?.id;
  if (!certificateId) {
    const { data: existing, error: exErr } = await supabase
      .from("certificates")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();
    if (exErr || !existing)
      return NextResponse.json(
        { error: exErr?.message || "Issue failed" },
        { status: 500 }
      );
    certificateId = existing.id;
  }

  return NextResponse.json({ id: certificateId });
}
