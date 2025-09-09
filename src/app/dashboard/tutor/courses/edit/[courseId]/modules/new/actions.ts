// src/app/dashboard/tutor/courses/edit/[courseId]/modules/new/actions.ts
"use server";

import { redirect } from "next/navigation";
import { getSupabaseRSC } from "@/lib/supabase-rsc";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "student" | "tutor" | "admin" | "super admin" | null;
const normalizeRole = (r?: string | null): Role =>
  r ? (r.toLowerCase().trim() as Role) : null;
const isAdmin = (role: Role) => role === "admin" || role === "super admin";

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

export async function createModule(formData: FormData) {
  const courseId = getStr(formData, "course_id");
  const title = getStr(formData, "title");
  const desiredOrderingInput = getNum(formData, "ordering");
  const redirect_to =
    getStr(formData, "redirect_to") ??
    (courseId
      ? `/dashboard/tutor/courses/edit/${courseId}#modules`
      : "/dashboard/tutor");

  if (!courseId || !title) throw new Error("Missing course_id or title");

  // Auth & role
  const sb = getSupabaseRSC();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: prof } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = normalizeRole(prof?.role ?? null);

  // Ownership/admin
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("instructor_id")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) throw new Error("Course not found");
  if (!(course.instructor_id === user.id || isAdmin(role))) {
    throw new Error("Forbidden");
  }

  // Compute max and clamp desired ordering
  const { data: maxRow, error: maxErr } = await supabaseAdmin
    .from("modules")
    .select("ordering")
    .eq("course_id", courseId)
    .order("ordering", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) throw new Error(maxErr.message);

  const maxOrdering = maxRow?.ordering ?? 0;
  const nextOrdering = maxOrdering + 1;

  let desiredOrdering = desiredOrderingInput ?? nextOrdering;
  if (desiredOrdering < 1) desiredOrdering = 1;
  if (desiredOrdering > nextOrdering) desiredOrdering = nextOrdering;

  // If inserting in the middle, shift existing rows down (descending updates avoid unique collisions)
  if (desiredOrdering <= maxOrdering) {
    const { data: toShift, error: listErr } = await supabaseAdmin
      .from("modules")
      .select("id, ordering")
      .eq("course_id", courseId)
      .gte("ordering", desiredOrdering)
      .order("ordering", { ascending: false });

    if (listErr) throw new Error(listErr.message);

    for (const row of toShift ?? []) {
      const { error: updErr } = await supabaseAdmin
        .from("modules")
        .update({ ordering: (row.ordering ?? 0) + 1 })
        .eq("id", row.id);
      if (updErr) throw new Error(updErr.message);
    }
  }

  const { error: insErr } = await supabaseAdmin
    .from("modules")
    .insert({ course_id: courseId, title, ordering: desiredOrdering });
  if (insErr) throw new Error(insErr.message);

  redirect(redirect_to);
}
