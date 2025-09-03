// src/app/api/courses/archive/route.ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseRSC } from "@/lib/supabase-rsc"; // server client bound to request cookies (RLS applies)
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // service role (bypasses RLS)

function isAdminRole(role: string | null | undefined) {
  const r = (role ?? "").toLowerCase().trim();
  return r === "admin" || r === "super admin";
}
function isTutorRole(role: string | null | undefined) {
  const r = (role ?? "").toLowerCase().trim();
  return r === "tutor";
}

export async function POST(req: Request) {
  try {
    const sb = getSupabaseRSC();

    // 1) Who is the caller?
    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2) Role (from profiles)
    const { data: prof, error: profErr } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    const body = (await req.json()) as { courseId?: string };
    if (!body?.courseId) {
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
    }
    const { courseId } = body;

    // 3) Admins can archive any course; tutors can archive only their own
    if (isAdminRole(prof?.role)) {
      // service-role update (no RLS)
      const { error: updErr } = await supabaseAdmin
        .from("courses")
        .update({ archived: true })
        .eq("id", courseId);

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
      // Revalidate admin view
      revalidatePath("/admin/courses");
      return NextResponse.json({ ok: true });
    }

    if (isTutorRole(prof?.role)) {
      // RLS path: only tutor’s own course will pass the policy
      const { error: updErr } = await sb
        .from("courses")
        .update({ archived: true })
        .eq("id", courseId)
        // extra guard — not required if RLS already enforces it, but harmless
        .eq("instructor_id", user.id);

      if (updErr) {
        // If you see "RLS" here, your UPDATE policy is missing or too strict.
        return NextResponse.json({ error: updErr.message }, { status: 403 });
      }
      // Revalidate tutor pages (adjust to your paths)
      revalidatePath("/dashboard/tutor");
      revalidatePath(`/courses/${courseId}`);
      return NextResponse.json({ ok: true });
    }

    // Everyone else: forbidden
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
