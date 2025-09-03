// src/app/api/courses/delete/route.ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseRSC } from "@/lib/supabase-rsc"; // cookies-bound client (RLS)
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // service role (no RLS)

function isAdminRole(role: string | null | undefined) {
  const r = (role ?? "").toLowerCase().trim();
  return r === "admin" || r === "super admin";
}
function isTutorRole(role: string | null | undefined) {
  return (role ?? "").toLowerCase().trim() === "tutor";
}

export async function POST(req: Request) {
  try {
    // 1) Auth + role
    const sb = getSupabaseRSC();
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

    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    const body = (await req.json()) as { courseId?: string };
    const courseId = body?.courseId;
    if (!courseId) {
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
    }

    // 2) Permission check
    if (!isAdminRole(prof?.role)) {
      // If not admin, must be a tutor AND the owner of the course
      if (!isTutorRole(prof?.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Verify ownership (use admin client to avoid RLS surprises on read)
      const { data: courseRow, error: courseErr } = await supabaseAdmin
        .from("courses")
        .select("instructor_id")
        .eq("id", courseId)
        .single();

      if (courseErr || !courseRow) {
        return NextResponse.json(
          { error: courseErr?.message || "Course not found" },
          { status: 404 }
        );
      }
      if (courseRow.instructor_id !== user.id) {
        return NextResponse.json(
          { error: "You can only delete your own course." },
          { status: 403 }
        );
      }
    }

    // 3) Collect related IDs
    // modules
    const { data: modules, error: modErr } = await supabaseAdmin
      .from("modules")
      .select("id")
      .eq("course_id", courseId);
    if (modErr) {
      return NextResponse.json({ error: modErr.message }, { status: 500 });
    }
    const moduleIds = (modules ?? []).map((m) => m.id);

    // module lessons (ids, useful for lesson_completions cleanup)
    let lessonIds: string[] = [];
    if (moduleIds.length) {
      const { data: lessonRows, error: lesErr } = await supabaseAdmin
        .from("lessons")
        .select("id")
        .in("module_id", moduleIds);
      if (lesErr) {
        return NextResponse.json({ error: lesErr.message }, { status: 500 });
      }
      lessonIds = (lessonRows ?? []).map((l) => l.id);
    }

    // quizzes (module-level)
    const quizIdSet = new Set<string>();
    if (moduleIds.length) {
      const { data: modQuizzes, error: mqErr } = await supabaseAdmin
        .from("quizzes")
        .select("id")
        .in("module_id", moduleIds);
      if (mqErr) {
        return NextResponse.json({ error: mqErr.message }, { status: 500 });
      }
      (modQuizzes ?? []).forEach((q) => quizIdSet.add(q.id));
    }

    // quizzes (course-level, includes final quiz)
    const { data: courseQuizzes, error: cqErr } = await supabaseAdmin
      .from("quizzes")
      .select("id")
      .eq("course_id", courseId);
    if (cqErr) {
      return NextResponse.json({ error: cqErr.message }, { status: 500 });
    }
    (courseQuizzes ?? []).forEach((q) => quizIdSet.add(q.id));

    const allQuizIds = Array.from(quizIdSet);

    // quiz questions
    let questionIds: string[] = [];
    if (allQuizIds.length) {
      const { data: questions, error: qErr } = await supabaseAdmin
        .from("quiz_questions")
        .select("id")
        .in("quiz_id", allQuizIds);
      if (qErr) {
        return NextResponse.json({ error: qErr.message }, { status: 500 });
      }
      questionIds = (questions ?? []).map((q) => q.id);
    }

    // quiz attempts (optional cleanup if FKs don’t cascade)
    let attemptIds: string[] = [];
    if (allQuizIds.length) {
      const { data: attempts, error: aErr } = await supabaseAdmin
        .from("quiz_attempts")
        .select("id")
        .in("quiz_id", allQuizIds);
      if (aErr) {
        return NextResponse.json({ error: aErr.message }, { status: 500 });
      }
      attemptIds = (attempts ?? []).map((a) => a.id);
    }

    // 4) Delete in safe order
    // question_responses (if you track responses per attempt)
    if (attemptIds.length) {
      await supabaseAdmin
        .from("question_responses")
        .delete()
        .in("attempt_id", attemptIds);
    }

    // quiz_options -> quiz_questions -> quiz_attempts -> quizzes
    if (questionIds.length) {
      await supabaseAdmin
        .from("quiz_options")
        .delete()
        .in("question_id", questionIds);
    }
    if (allQuizIds.length) {
      await supabaseAdmin
        .from("quiz_questions")
        .delete()
        .in("quiz_id", allQuizIds);
    }
    if (attemptIds.length) {
      await supabaseAdmin.from("quiz_attempts").delete().in("id", attemptIds);
    }
    if (allQuizIds.length) {
      await supabaseAdmin.from("quizzes").delete().in("id", allQuizIds);
    }

    // lesson_completions (if no FK cascade)
    if (lessonIds.length) {
      await supabaseAdmin
        .from("lesson_completions")
        .delete()
        .in("lesson_id", lessonIds);
    }

    // lessons -> modules
    if (moduleIds.length) {
      await supabaseAdmin.from("lessons").delete().in("module_id", moduleIds);
      await supabaseAdmin.from("modules").delete().in("id", moduleIds);
    }

    // enrollments (if no FK cascade)
    await supabaseAdmin.from("enrollments").delete().eq("course_id", courseId);

    // certificates (optional cleanup)
    await supabaseAdmin.from("certificates").delete().eq("course_id", courseId);

    // finally: course
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

    // 5) Revalidate pages
    revalidatePath("/admin/courses");
    revalidatePath("/dashboard/tutor");

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
