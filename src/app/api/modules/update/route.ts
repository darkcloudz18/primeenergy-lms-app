import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseRSC } from "@/lib/supabase-rsc";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** ───── helpers ───── */
type Role = "student" | "tutor" | "admin" | "super admin" | null;
const normalizeRole = (r?: string | null): Role =>
  r ? (r.toLowerCase().trim() as Role) : null;
const isAdmin = (role: Role) => role === "admin" || role === "super admin";

const getStr = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" && v.length > 0 ? v : undefined;
};
const getNum = (fd: FormData, key: string) => {
  const v = fd.get(key);
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Decide the redirect target.
 * Priority:
 *  1) explicit hidden input "redirect_to"
 *  2) Referer is a Tutor page -> tutor editor
 *  3) fallback to admin editor
 */
function resolveRedirectTarget(
  req: Request,
  courseId: string,
  explicit?: string
) {
  if (explicit) return explicit;

  const referer = req.headers.get("referer") || "";
  if (referer.includes("/dashboard/tutor/")) {
    return `/dashboard/tutor/courses/edit/${courseId}`;
  }
  return `/admin/courses/edit/${courseId}`;
}

export async function POST(req: Request) {
  try {
    // Parse form
    const fd = await req.formData();
    const id = getStr(fd, "id") ?? getStr(fd, "module_id"); // accept either name
    if (!id) {
      return NextResponse.json({ error: "Missing module id" }, { status: 400 });
    }

    const title = getStr(fd, "title");
    const ordering = getNum(fd, "ordering");
    const redirect_to_input = getStr(fd, "redirect_to"); // optional

    // Auth
    const sb = getSupabaseRSC();
    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Role
    const { data: prof } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = normalizeRole(prof?.role ?? null);

    // Find module -> course
    const { data: mod, error: modErr } = await supabaseAdmin
      .from("modules")
      .select("id, course_id")
      .eq("id", id)
      .single();

    if (modErr || !mod) {
      return NextResponse.json(
        { error: modErr?.message || "Module not found" },
        { status: 404 }
      );
    }

    // Course owner?
    const { data: course, error: cErr } = await supabaseAdmin
      .from("courses")
      .select("instructor_id")
      .eq("id", mod.course_id)
      .single();

    if (cErr || !course) {
      return NextResponse.json(
        { error: cErr?.message || "Course not found" },
        { status: 404 }
      );
    }

    const isOwner = course.instructor_id === user.id;
    if (!(isAdmin(role) || isOwner)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build patch
    const patch: Record<string, unknown> = {};
    if (title !== undefined) patch.title = title;
    if (ordering !== undefined) patch.ordering = ordering;

    if (Object.keys(patch).length > 0) {
      const { error: updErr } = await supabaseAdmin
        .from("modules")
        .update(patch)
        .eq("id", id);

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
    }

    // Revalidate relevant pages
    revalidatePath(`/admin/courses/edit/${mod.course_id}`);
    revalidatePath(`/dashboard/tutor/courses/edit/${mod.course_id}`);

    // Respond: JSON for fetch callers, redirect for normal form posts
    const accepts = req.headers.get("accept") || "";
    const target = resolveRedirectTarget(req, mod.course_id, redirect_to_input);

    if (accepts.includes("application/json")) {
      return NextResponse.json({
        ok: true,
        id,
        course_id: mod.course_id,
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
