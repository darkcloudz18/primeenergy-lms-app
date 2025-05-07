// src/app/demo/quiz/page.tsx
import Link from "next/link";

export default function DemoQuizPage() {
  return (
    <div className="max-w-5xl mx-auto py-12 flex gap-8">
      <aside className="w-64">{/* sidebar same as lesson */}</aside>
      <section className="flex-1">
        <h3 className="text-2xl font-semibold mb-4 text-black">
          Quiz: EMI Basics
        </h3>
        <p className="mb-6 text-black">
          1 of 10 • Ferrite beads are used to suppress high-frequency noise in
          cables.
        </p>
        <div className="space-x-4 mb-6">
          <label className="inline-flex items-center">
            <input type="radio" name="q1" />{" "}
            <span className="ml-2 text-black">True</span>
          </label>
          <label className="inline-flex items-center">
            <input type="radio" name="q1" />{" "}
            <span className="ml-2 text-black">False</span>
          </label>
        </div>
        <Link href="/demo/certificate">
          <button className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700">
            Submit & Next
          </button>
        </Link>
      </section>
    </div>
  );
}
