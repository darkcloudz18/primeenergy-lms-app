// src/app/admin/courses/edit/[courseId]/modules/[moduleId]/lessons/new/page.tsx
export default function AdminNewLesson({
  params,
}: {
  params: { courseId: string; moduleId: string };
}) {
  const { courseId, moduleId } = params;
  const back = `/admin/courses/edit/${courseId}`;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Add Lesson</h1>

      <form
        action="/api/lessons/create"
        method="POST"
        className="space-y-4 bg-white p-4 rounded shadow"
      >
        <input type="hidden" name="module_id" value={moduleId} />
        <input
          type="hidden"
          name="redirect_to"
          value={`${back}#module-${moduleId}`}
        />

        <label className="block">
          <span className="text-sm">Title</span>
          <input
            name="title"
            className="mt-1 w-full border rounded px-3 py-2"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm">Type</span>
          <select
            name="type"
            defaultValue="article"
            className="mt-1 w-full border rounded px-3 py-2"
          >
            <option value="article">Article</option>
            <option value="video">Video</option>
            <option value="image">Image</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm">Content (HTML allowed)</span>
          <textarea
            name="content"
            rows={8}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>

        {/* Optional if you want to insert at a specific position */}
        <label className="block">
          <span className="text-sm">Ordering (optional)</span>
          <input
            type="number"
            name="ordering"
            min={1}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>

        <button className="px-4 py-2 bg-green-600 text-white rounded">
          Save Lesson
        </button>
      </form>
    </main>
  );
}
