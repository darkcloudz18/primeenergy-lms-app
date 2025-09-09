// src/app/admin/courses/edit/[courseId]/modules/[moduleId]/lessons/new/actions.ts
"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseRSC } from "@/lib/supabase-rsc";

type Role = "student" | "tutor" | "admin" | "super admin" | null;
const normalizeRole = (r?: string | null): Role =>
  r ? (r.toLowerCase().trim() as Role) : null;
const isAdmin = (role: Role) => role === "admin" || role === "super admin";

function s(fd: FormData, k: string): string | undefined {
  const v = fd.get(k);
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
function n(fd: FormData, k: string): number | undefined {
  const v = fd.get(k);
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const num = Number(v);
  return Number.isFinite(num) ? num : undefined;
}
function isUuid(v?: string) {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

/* ---------------- create ---------------- */

export async function createLesson(formData: FormData) {
  const courseId = s(formData, "course_id");
  const moduleId = s(formData, "module_id");
  const title = s(formData, "title") ?? "";
  const type = (s(formData, "type") ?? "article") as
    | "article"
    | "video"
    | "image";
  const content = s(formData, "content") ?? s(formData, "content_html") ?? "";
  const image_url = s(formData, "image_url");
  const redirect_to =
    s(formData, "redirect_to") ??
    (courseId && moduleId
      ? `/admin/courses/edit/${courseId}#module-${moduleId}`
      : `/admin/courses`);

  if (!isUuid(courseId) || !isUuid(moduleId) || !title) {
    throw new Error("Missing required fields for createLesson.");
  }

  // auth
  const sb = getSupabaseRSC();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: prof } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = normalizeRole(prof?.role);

  // course ownership
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("instructor_id")
    .eq("id", courseId)
    .maybeSingle();
  const ownerOk =
    !!course && (isAdmin(role) || course.instructor_id === user.id);
  if (!ownerOk) throw new Error("Forbidden.");

  // module must belong to course
  const { data: mod } = await supabaseAdmin
    .from("modules")
    .select("id, course_id")
    .eq("id", moduleId)
    .maybeSingle();
  if (!mod || mod.course_id !== courseId)
    throw new Error("Module not found in course.");

  // compute ordering (append)
  const { data: maxRow } = await supabaseAdmin
    .from("lessons")
    .select("ordering")
    .eq("module_id", moduleId)
    .order("ordering", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordering = (maxRow?.ordering ?? 0) + 1;

  const { error } = await supabaseAdmin.from("lessons").insert([
    {
      module_id: moduleId,
      title,
      content,
      type,
      image_url: image_url ?? null,
      ordering,
    },
  ]);

  if (error) {
    console.error("createLesson error:", error);
    throw new Error(error.message);
  }
  redirect(redirect_to);
}

/* ---------------- update ---------------- */

export async function updateLesson(formData: FormData) {
  const courseId = s(formData, "course_id");
  const moduleId = s(formData, "module_id");
  const lessonId = s(formData, "lesson_id");
  const title = s(formData, "title");
  const type = s(formData, "type") as "article" | "video" | "image" | undefined;
  const content = s(formData, "content") ?? s(formData, "content_html"); // accept either
  const image_url = s(formData, "image_url");
  const desiredOrdering = n(formData, "ordering");
  const redirect_to =
    s(formData, "redirect_to") ??
    (courseId && moduleId
      ? `/admin/courses/edit/${courseId}#module-${moduleId}`
      : `/admin/courses`);

  if (!isUuid(courseId) || !isUuid(moduleId) || !isUuid(lessonId)) {
    throw new Error("Missing required fields for updateLesson.");
  }

  // auth
  const sb = getSupabaseRSC();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: prof } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = normalizeRole(prof?.role);

  // course ownership
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("instructor_id")
    .eq("id", courseId)
    .maybeSingle();
  const ownerOk =
    !!course && (isAdmin(role) || course.instructor_id === user.id);
  if (!ownerOk) throw new Error("Forbidden.");

  // module in course
  const { data: mod } = await supabaseAdmin
    .from("modules")
    .select("id, course_id")
    .eq("id", moduleId)
    .maybeSingle();
  if (!mod || mod.course_id !== courseId)
    throw new Error("Module not found in course.");

  // lesson in module
  const { data: existing } = await supabaseAdmin
    .from("lessons")
    .select("id, module_id, ordering")
    .eq("id", lessonId)
    .maybeSingle();
  if (!existing || existing.module_id !== moduleId)
    throw new Error("Lesson not found in module.");

  // build patch using real column names
  const patch: Record<string, unknown> = {};
  if (title !== undefined) patch.title = title;
  if (type !== undefined) patch.type = type;
  if (content !== undefined) patch.content = content; // <- key change
  if (image_url !== undefined) patch.image_url = image_url;

  // handle ordering collisions (unique within module)
  if (typeof desiredOrdering === "number" && desiredOrdering >= 1) {
    // if desiredOrdering is used by another lesson, move that other lesson to the end
    const { data: conflict } = await supabaseAdmin
      .from("lessons")
      .select("id")
      .eq("module_id", moduleId)
      .eq("ordering", desiredOrdering)
      .neq("id", lessonId)
      .maybeSingle();

    if (conflict?.id) {
      const { data: maxRow } = await supabaseAdmin
        .from("lessons")
        .select("ordering")
        .eq("module_id", moduleId)
        .order("ordering", { ascending: false })
        .limit(1)
        .maybeSingle();
      const bumpTo = (maxRow?.ordering ?? 0) + 1;

      const { error: bumpErr } = await supabaseAdmin
        .from("lessons")
        .update({ ordering: bumpTo })
        .eq("id", conflict.id);
      if (bumpErr) {
        console.error("updateLesson bumpErr:", bumpErr);
        throw new Error(bumpErr.message);
      }
    }
    patch.ordering = desiredOrdering;
  }

  const { error } = await supabaseAdmin
    .from("lessons")
    .update(patch)
    .eq("id", lessonId);

  if (error) {
    console.error("updateLesson error:", error);
    throw new Error(error.message);
  }

  redirect(redirect_to);
}

/* ---------------- delete ---------------- */

export async function deleteLesson(formData: FormData) {
  const courseId = s(formData, "course_id");
  const moduleId = s(formData, "module_id");
  const lessonId = s(formData, "lesson_id");
  const redirect_to =
    s(formData, "redirect_to") ??
    (courseId && moduleId
      ? `/admin/courses/edit/${courseId}#module-${moduleId}`
      : `/admin/courses`);

  if (!isUuid(courseId) || !isUuid(moduleId) || !isUuid(lessonId)) {
    throw new Error("Missing required fields for deleteLesson.");
  }

  // auth
  const sb = getSupabaseRSC();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: prof } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = normalizeRole(prof?.role);

  // course ownership
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("instructor_id")
    .eq("id", courseId)
    .maybeSingle();
  const ownerOk =
    !!course && (isAdmin(role) || course.instructor_id === user.id);
  if (!ownerOk) throw new Error("Forbidden.");

  // ensure lesson in module
  const { data: existing } = await supabaseAdmin
    .from("lessons")
    .select("id, module_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (!existing || existing.module_id !== moduleId)
    throw new Error("Lesson not found in module.");

  const { error } = await supabaseAdmin
    .from("lessons")
    .delete()
    .eq("id", lessonId);
  if (error) {
    console.error("deleteLesson error:", error);
    throw new Error(error.message);
  }

  redirect(redirect_to);
}
