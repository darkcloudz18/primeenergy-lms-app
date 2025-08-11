import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isAdminRole(role: string | null | undefined) {
  const r = (role ?? "").toLowerCase().trim();
  return r === "admin" || r === "super admin";
}

export async function POST(req: Request) {
  try {
    // 1) Auth + role check
    const sb = createServerClient();
    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: prof, error: profErr } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profErr || !isAdminRole(prof?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2) Parse body
    const { courseId } = (await req.json()) as { courseId?: string };
    if (!courseId) {
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
    }

    // 3) Gather related IDs (modules, quizzes, questions, options)
    // modules for this course
    const { data: modules, error: modErr } = await supabaseAdmin
      .from("modules")
      .select("id")
      .eq("course_id", courseId);

    if (modErr) {
      return NextResponse.json({ error: modErr.message }, { status: 500 });
    }
    const moduleIds = (modules ?? []).map((m) => m.id);

    // quizzes attached to modules
    let allQuizIds: string[] = [];
    if (moduleIds.length > 0) {
      const { data: modQuizzes, error: mqErr } = await supabaseAdmin
        .from("quizzes")
        .select("id")
        .in("module_id", moduleIds);

      if (mqErr) {
        return NextResponse.json({ error: mqErr.message }, { status: 500 });
      }
      allQuizIds = allQuizIds.concat((modQuizzes ?? []).map((q) => q.id));
    }

    // final (course-level) quizzes
    const { data: courseQuizzes, error: cqErr } = await supabaseAdmin
      .from("quizzes")
      .select("id")
      .eq("course_id", courseId);

    if (cqErr) {
      return NextResponse.json({ error: cqErr.message }, { status: 500 });
    }
    allQuizIds = allQuizIds.concat((courseQuizzes ?? []).map((q) => q.id));

    // quiz questions
    let questionIds: string[] = [];
    if (allQuizIds.length > 0) {
      const { data: questions, error: qErr } = await supabaseAdmin
        .from("quiz_questions")
        .select("id")
        .in("quiz_id", allQuizIds);

      if (qErr) {
        return NextResponse.json({ error: qErr.message }, { status: 500 });
      }
      questionIds = (questions ?? []).map((q) => q.id);
    }

    // 4) Delete in safe order (options -> questions -> quizzes -> lessons -> modules -> enrollments -> course)

    // quiz_options
    if (questionIds.length > 0) {
      const { error: optDelErr } = await supabaseAdmin
        .from("quiz_options")
        .delete()
        .in("question_id", questionIds);
      if (optDelErr) {
        return NextResponse.json({ error: optDelErr.message }, { status: 500 });
      }
    }

    // quiz_questions
    if (allQuizIds.length > 0) {
      const { error: qDelErr } = await supabaseAdmin
        .from("quiz_questions")
        .delete()
        .in("quiz_id", allQuizIds);
      if (qDelErr) {
        return NextResponse.json({ error: qDelErr.message }, { status: 500 });
      }
    }

    // quizzes
    if (allQuizIds.length > 0) {
      const { error: quizDelErr } = await supabaseAdmin
        .from("quizzes")
        .delete()
        .in("id", allQuizIds);
      if (quizDelErr) {
        return NextResponse.json(
          { error: quizDelErr.message },
          { status: 500 }
        );
      }
    }

    // lessons
    if (moduleIds.length > 0) {
      const { error: lessonDelErr } = await supabaseAdmin
        .from("lessons")
        .delete()
        .in("module_id", moduleIds);
      if (lessonDelErr) {
        return NextResponse.json(
          { error: lessonDelErr.message },
          { status: 500 }
        );
      }
    }

    // modules
    if (moduleIds.length > 0) {
      const { error: modDelErr } = await supabaseAdmin
        .from("modules")
        .delete()
        .in("id", moduleIds);
      if (modDelErr) {
        return NextResponse.json({ error: modDelErr.message }, { status: 500 });
      }
    }

    // enrollments
    const { error: enrDelErr } = await supabaseAdmin
      .from("enrollments")
      .delete()
      .eq("course_id", courseId);
    if (enrDelErr) {
      return NextResponse.json({ error: enrDelErr.message }, { status: 500 });
    }

    // course
    const { error: courseDelErr } = await supabaseAdmin
      .from("courses")
      .delete()
      .eq("id", courseId);
    if (courseDelErr) {
      return NextResponse.json(
        { error: courseDelErr.message },
        { status: 500 }
      );
    }

    // 5) Revalidate admin list page
    revalidatePath("/admin/courses");

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
