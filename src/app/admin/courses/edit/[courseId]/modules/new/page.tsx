import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createModule } from "./actions";

export default async function AdminNewModulePage({
  params,
}: {
  params: { courseId: string };
}) {
  const { courseId } = params;

  // Default next ordering (max + 1)
  const { data: maxRow } = await supabaseAdmin
    .from("modules")
    .select("ordering")
    .eq("course_id", courseId)
    .order("ordering", { ascending: false })
    .limit(1)
    .maybeSingle();

  const defaultOrdering = (maxRow?.ordering ?? 0) + 1;
  const back = `/admin/courses/edit/${courseId}`;

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Add Module</h1>

      <form
        action={createModule}
        className="bg-white rounded shadow p-4 space-y-4"
      >
        <input type="hidden" name="course_id" value={courseId} />
        <input type="hidden" name="redirect_to" value={`${back}#modules`} />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Title</label>
            <input
              name="title"
              required
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="Module title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Position (ordering)
            </label>
            <input
              type="number"
              name="ordering"
              min={1}
              defaultValue={defaultOrdering}
              className="mt-1 w-full border rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              1 = top. Defaults to the next available position.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Save Module
          </button>
          <a href={back} className="px-4 py-2 border rounded hover:bg-gray-50">
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}
