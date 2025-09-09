import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PageProps = { params: { courseId: string; moduleId: string } };

export default async function EditModulePage({ params }: PageProps) {
  const { courseId, moduleId } = params;

  const { data: mod, error } = await supabaseAdmin
    .from("modules")
    .select("id, title, ordering")
    .eq("id", moduleId)
    .single();

  if (error || !mod) {
    return (
      <main className="max-w-lg mx-auto p-6">
        <p className="text-red-600">Couldn’t load module.</p>
      </main>
    );
  }

  async function save(formData: FormData) {
    "use server";
    const title = String(formData.get("title") || "").trim();
    const ordering = Number(formData.get("ordering") || 1);

    const { error: updErr } = await supabaseAdmin
      .from("modules")
      .update({ title, ordering })
      .eq("id", moduleId);

    if (updErr) throw new Error(updErr.message);
    redirect(`/admin/courses/edit/${courseId}`);
  }

  return (
    <main className="max-w-lg mx-auto p-6 bg-white rounded shadow space-y-4">
      <h1 className="text-2xl font-semibold">Edit Module</h1>
      <form action={save} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Title</label>
          <input
            name="title"
            defaultValue={mod.title}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Ordering</label>
          <input
            type="number"
            name="ordering"
            defaultValue={mod.ordering ?? 1}
            className="w-full border rounded px-3 py-2"
            min={1}
          />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-green-600 text-white rounded">
            Save
          </button>
          <a
            href={`/admin/courses/edit/${courseId}`}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}
