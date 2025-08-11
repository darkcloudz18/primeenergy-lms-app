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
    // 1) Auth + role check (via RLS-safe server client)
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

    // 3) Archive
    const { error: updErr } = await supabaseAdmin
      .from("courses")
      .update({ archived: true })
      .eq("id", courseId);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // 4) Revalidate admin list
    revalidatePath("/admin/courses");

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
