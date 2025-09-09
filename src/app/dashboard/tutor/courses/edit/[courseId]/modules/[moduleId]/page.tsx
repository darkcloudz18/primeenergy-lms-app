export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSupabaseRSC } from "@/lib/supabase-rsc";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isAdminRole(role?: string | null) {
  const r = (role ?? "").toLowerCase().trim();
  return r === "admin" || r === "super admin";
}

interface PageProps {
  params: { courseId: string; moduleId: string };
}

export default async function TutorModuleEditPage({ params }: PageProps) {
  const { courseId, moduleId } = params;
  const sb = getSupabaseRSC();

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return <div className="p-6 text-red-600">Not authenticated.</div>;

  // verify course
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("id,instructor_id,title")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) return <div className="p-6 text-red-600">Course not found.</div>;

  let isAdmin = false;
  {
    const { data: prof } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = isAdminRole(prof?.role);
  }
  if (!isAdmin && course.instructor_id !== user.id) {
    return <div className="p-6 text-red-600">Forbidden.</div>;
  }

  const { data: mod } = await supabaseAdmin
    .from("modules")
    .select("id,course_id,title,ordering")
    .eq("id", moduleId)
    .single();
  if (!mod || mod.course_id !== courseId) {
    return <div className="p-6 text-red-600">Module not found.</div>;
  }

  const back = `/dashboard/tutor/courses/edit/${courseId}`;

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Module</h1>
        <Link href={back} className="text-blue-600 hover:underline">
          ← Back
        </Link>
      </div>

      <form
        action="/api/modules/update"
        method="POST"
        className="bg-white p-4 rounded shadow space-y-4"
      >
        <input type="hidden" name="id" value={mod.id} />
        <input type="hidden" name="course_id" value={courseId} />
        <input type="hidden" name="redirect_to" value={back} />

        <label className="block">
          <span className="text-sm font-medium">Title</span>
          <input
            name="title"
            required
            defaultValue={mod.title}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Ordering</span>
          <input
            type="number"
            name="ordering"
            defaultValue={mod.ordering ?? 1}
            className="mt-1 w-full border rounded px-3 py-2"
            min={1}
          />
        </label>

        <button className="px-4 py-2 bg-green-600 text-white rounded">
          Save Module
        </button>
      </form>
    </main>
  );
}
