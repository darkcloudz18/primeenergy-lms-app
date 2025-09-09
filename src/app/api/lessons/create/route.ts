import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseRSC } from "@/lib/supabase-rsc";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// helpers
const getStr = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};
const getNum = (fd: FormData, key: string): number | undefined => {
  const v = fd.get(key);
  if (typeof v !== "string" || !v.trim()) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const resolveRedirect = (req: Request, fallback: string, explicit?: string) => {
  if (explicit) return explicit;
  const referer = req.headers.get("referer") || "";
  // If it came from a tutor page, keep them in tutor; else default to admin
  if (referer.includes("/dashboard/tutor/"))
    return fallback.replace("/admin/", "/dashboard/tutor/");
  return fallback;
};

export async function POST(req: Request) {
  try {
    const fd = await req.formData();

    const module_id = getStr(fd, "module_id"); // required
    const title = getStr(fd, "title"); // required
    const type = getStr(fd, "type") ?? "article";
    const content = getStr(fd, "content") ?? "";
    const image_url = getStr(fd, "image_url");
    const orderingInput = getNum(fd, "ordering");
    const redirect_to = getStr(fd, "redirect_to");

    if (!module_id || !title) {
      return NextResponse.json(
        { error: "Missing module_id or title" },
        { status: 400 }
      );
    }

    // auth
    const sb = getSupabaseRSC();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // find course and check ownership/admin (optional but safer)
    const { data: mod } = await supabaseAdmin
      .from("modules")
      .select("id, course_id")
      .eq("id", module_id)
      .maybeSingle();
    if (!mod)
      return NextResponse.json({ error: "Module not found" }, { status: 404 });

    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("instructor_id")
      .eq("id", mod.course_id)
      .maybeSingle();
    if (!course)
      return NextResponse.json({ error: "Course not found" }, { status: 404 });

    // Optional: role check (admin or owner)
    const { data: prof } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = (prof?.role ?? "").toLowerCase().trim();
    const isAdmin = role === "admin" || role === "super admin";
    const isOwner = course.instructor_id === user.id;
    if (!(isAdmin || isOwner)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // compute desired ordering
    const { data: maxRow, error: maxErr } = await supabaseAdmin
      .from("lessons")
      .select("ordering")
      .eq("module_id", module_id)
      .order("ordering", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxErr)
      return NextResponse.json({ error: maxErr.message }, { status: 500 });

    const maxOrdering = maxRow?.ordering ?? 0;
    const nextOrdering = maxOrdering + 1;

    let desiredOrdering = orderingInput ?? nextOrdering;
    if (desiredOrdering < 1) desiredOrdering = 1;
    if (desiredOrdering > nextOrdering) desiredOrdering = nextOrdering;

    // if inserting in the middle, shift down existing
    if (desiredOrdering <= maxOrdering) {
      const { data: toShift, error: listErr } = await supabaseAdmin
        .from("lessons")
        .select("id, ordering")
        .eq("module_id", module_id)
        .gte("ordering", desiredOrdering)
        .order("ordering", { ascending: false });
      if (listErr)
        return NextResponse.json({ error: listErr.message }, { status: 500 });

      for (const row of toShift ?? []) {
        const { error: updErr } = await supabaseAdmin
          .from("lessons")
          .update({ ordering: (row.ordering ?? 0) + 1 })
          .eq("id", row.id);
        if (updErr)
          return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
    }

    const insert = {
      module_id,
      title,
      type,
      content,
      image_url,
      ordering: desiredOrdering,
    };
    const { data: created, error: insErr } = await supabaseAdmin
      .from("lessons")
      .insert(insert)
      .select("id, module_id")
      .single();
    if (insErr || !created) {
      return NextResponse.json(
        { error: insErr?.message ?? "Insert failed" },
        { status: 500 }
      );
    }

    // revalidate admin & tutor edit pages
    revalidatePath(`/admin/courses`);
    revalidatePath(`/admin/courses/edit/${mod.course_id}`);
    revalidatePath(`/dashboard/tutor/courses/edit/${mod.course_id}`);

    // redirect (HTML form) or JSON (fetch)
    const accepts = req.headers.get("accept") || "";
    const fallback = `/admin/courses/edit/${mod.course_id}#module-${module_id}`;
    const target = resolveRedirect(req, fallback, redirect_to);

    if (accepts.includes("application/json")) {
      return NextResponse.json({
        ok: true,
        id: created.id,
        redirect_to: target,
      });
    }
    const res = NextResponse.redirect(new URL(target, req.url), {
      status: 303,
    });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
