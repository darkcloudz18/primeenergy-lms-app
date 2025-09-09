import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseRSC } from "@/lib/supabase-rsc";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const getStr = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};
const getNum = (fd: FormData, k: string): number | undefined => {
  const v = fd.get(k);
  if (typeof v !== "string" || !v.trim()) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const resolveRedirect = (req: Request, fallback: string, explicit?: string) => {
  if (explicit) return explicit;
  const referer = req.headers.get("referer") || "";
  if (referer.includes("/dashboard/tutor/"))
    return fallback.replace("/admin/", "/dashboard/tutor/");
  return fallback;
};

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const id = getStr(fd, "id") ?? getStr(fd, "lesson_id"); // accept either
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const title = getStr(fd, "title");
    const content = getStr(fd, "content");
    const type = getStr(fd, "type");
    const image_url = getStr(fd, "image_url");
    const orderingInput = getNum(fd, "ordering");
    const redirect_to = getStr(fd, "redirect_to");

    // auth
    const sb = getSupabaseRSC();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // find current lesson + module + course
    const { data: les, error: lesErr } = await supabaseAdmin
      .from("lessons")
      .select("id, module_id, ordering")
      .eq("id", id)
      .maybeSingle();
    if (lesErr || !les)
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

    const { data: mod } = await supabaseAdmin
      .from("modules")
      .select("id, course_id")
      .eq("id", les.module_id)
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

    // role check
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

    // handle ordering change
    const patch: Record<string, unknown> = {};
    if (title !== undefined) patch.title = title;
    if (content !== undefined) patch.content = content;
    if (type !== undefined) patch.type = type;
    if (image_url !== undefined) patch.image_url = image_url;

    if (orderingInput !== undefined && orderingInput !== les.ordering) {
      // compute bounds
      const { data: maxRow } = await supabaseAdmin
        .from("lessons")
        .select("ordering")
        .eq("module_id", les.module_id)
        .order("ordering", { ascending: false })
        .limit(1)
        .maybeSingle();

      const maxOrdering = maxRow?.ordering ?? 1;
      let newOrdering = orderingInput;
      if (newOrdering < 1) newOrdering = 1;
      if (newOrdering > maxOrdering) newOrdering = maxOrdering;

      // shift neighbors
      if (newOrdering < (les.ordering ?? 1)) {
        // move up → push down those between new..old-1
        await supabaseAdmin
          .from("lessons")
          .update({
            ordering: supabaseAdmin.rpc("inc", { x: 1 }) as unknown as number,
          }) // fallback if you have an inc rpc; else loop
          .eq("module_id", les.module_id)
          .gte("ordering", newOrdering)
          .lt("ordering", les.ordering ?? 1);
        // If you don't have an `inc` RPC, replace the above with a manual loop (like in create route).
      } else {
        // move down → pull up those between old+1..new
        await supabaseAdmin
          .from("lessons")
          .update({
            ordering: supabaseAdmin.rpc("dec", { x: 1 }) as unknown as number,
          })
          .eq("module_id", les.module_id)
          .gt("ordering", les.ordering ?? 1)
          .lte("ordering", newOrdering);
      }
      patch.ordering = newOrdering;
    }

    if (Object.keys(patch).length > 0) {
      const { error: updErr } = await supabaseAdmin
        .from("lessons")
        .update(patch)
        .eq("id", id);
      if (updErr)
        return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    revalidatePath(`/admin/courses/edit/${mod.course_id}`);
    revalidatePath(`/dashboard/tutor/courses/edit/${mod.course_id}`);

    const accepts = req.headers.get("accept") || "";
    const fallback = `/admin/courses/edit/${mod.course_id}#module-${les.module_id}`;
    const target = resolveRedirect(req, fallback, redirect_to);
    if (accepts.includes("application/json")) {
      return NextResponse.json({ ok: true, id, redirect_to: target });
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
