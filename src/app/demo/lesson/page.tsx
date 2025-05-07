// src/app/demo/lesson/page.tsx
import Link from "next/link";

export default function DemoLessonPage() {
  return (
    <div className="max-w-5xl mx-auto py-12 flex gap-8">
      {/* Sidebar */}
      <aside className="w-64 space-y-4">
        <h2 className="font-semibold">Module 1: EMI Basics</h2>
        <ul className="space-y-2">
          <li className="text-green-600">✔ Understanding Radiated Emissions</li>
          <li className="font-bold">Best Practices for Reducing Emissions</li>
          <li>Case Studies</li>
          {/* … */}
          <li>
            <Link href="/demo/quiz" className="text-blue-600 underline">
              Quiz: EMI Basics
            </Link>
          </li>
        </ul>
      </aside>

      {/* Lesson content */}
      <section className="flex-1 space-y-6">
        <h3 className="text-2xl font-semibold">
          Best Practices for Reducing Emissions
        </h3>
        <p className="text-gray-700">
          1. Proper System Design: Minimize cable lengths...
        </p>
        {/* …more static content… */}
        <Link href="/demo/quiz">
          <button className="mt-6 px-5 py-2 bg-green-600 text-white rounded">
            Take the Quiz
          </button>
        </Link>
      </section>
    </div>
  );
}
