// src/app/api/courses/update/route.ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseRSC } from "@/lib/supabase-rsc";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "student" | "tutor" | "admin" | "super admin" | null;

function normalizeRole(raw?: string | null): Role {
  if (!raw) return null;
  const r = raw.toLowerCase().trim();
  if (r === "super admin") return "super admin";
  if (r === "admin") return "admin";
  if (r === "tutor") return "tutor";
  if (r === "student") return "student";
  return null;
}
const isAdmin = (role: Role) => role === "admin" || role === "super admin";

function getStr(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
function getBool(fd: FormData, key: string): boolean | undefined {
  const v = fd.get(key);
  if (v === null) return undefined;
  // checkboxes submit "on" when checked; we also accept "true"
  return v === "on" || v === "true";
}

function resolveRedirectTarget(
  req: Request,
  courseId: string,
  explicit?: string
) {
  if (explicit) return explicit;

  const referer = req.headers.get("referer") || "";
  // If the form came from tutor dashboard/editor, go back there
  if (
    referer.includes(`/dashboard/tutor/`) ||
    referer.includes(`/dashboard/tutor/courses/edit/${courseId}`)
  ) {
    return `/dashboard/tutor/courses/edit/${courseId}`;
  }
  // Otherwise default to admin editor
  return `/admin/courses/edit/${courseId}`;
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();

    // required
    const id = getStr(fd, "id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // optional updates
    const title = getStr(fd, "title");
    const description = getStr(fd, "description");
    const category = getStr(fd, "category");
    const level = getStr(fd, "level");
    const tag = getStr(fd, "tag");
    const image_url = getStr(fd, "image_url");
    const redirect_to_input = getStr(fd, "redirect_to"); // optional

    // auth/role
    const sb = getSupabaseRSC();
    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { data: prof } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = normalizeRole(prof?.role ?? null);

    // fetch course to check owner
    const { data: courseRow, error: courseErr } = await supabaseAdmin
      .from("courses")
      .select("id,instructor_id")
      .eq("id", id)
      .single();
    if (courseErr || !courseRow) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const isOwner = courseRow.instructor_id === user.id;
    if (!(isAdmin(role) || isOwner)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // build update patch (only provided fields)
    const patch: Record<string, unknown> = {};
    if (title !== undefined) patch.title = title;
    if (description !== undefined) patch.description = description;
    if (category !== undefined) patch.category = category;
    if (level !== undefined) patch.level = level;
    if (tag !== undefined) patch.tag = tag;
    if (image_url !== undefined) patch.image_url = image_url;

    // admin-only fields
    const archived = getBool(fd, "archived");
    const instructor_id = getStr(fd, "instructor_id");
    if (isAdmin(role)) {
      if (archived !== undefined) patch.archived = archived;
      if (instructor_id) patch.instructor_id = instructor_id;
    }

    // If nothing to update, still redirect/JSON OK
    if (Object.keys(patch).length > 0) {
      const { error: updErr } = await supabaseAdmin
        .from("courses")
        .update(patch)
        .eq("id", id);

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
    }

    // Revalidate both UIs + public pages
    revalidatePath(`/admin/courses`);
    revalidatePath(`/admin/courses/edit/${id}`);
    revalidatePath(`/dashboard/tutor/my-courses`);
    revalidatePath(`/dashboard/tutor/courses/edit/${id}`);
    revalidatePath(`/courses`);
    revalidatePath(`/courses/${id}`);

    // Choose response style: JSON for fetch callers, redirect for normal form POSTs
    const accepts = req.headers.get("accept") || "";
    const target = resolveRedirectTarget(req, id, redirect_to_input);

    if (accepts.includes("application/json")) {
      return NextResponse.json({
        ok: true,
        id,
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
