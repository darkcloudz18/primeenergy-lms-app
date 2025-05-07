// src/app/demo/page.tsx
import Image from "next/image";
import Link from "next/link";

export default function DemoCoursePage() {
  return (
    <div className="max-w-5xl mx-auto py-12 space-y-8">
      <h1 className=" text-3xl font-bold text-black">
        Reducing Radiated Emissions in Solar PV Systems
      </h1>

      {/* replace <img> with next/image */}
      <div className="relative w-full h-[300px] rounded-md overflow-hidden shadow">
        <Image
          src="/demo-course-cover.jpg"
          alt="Course cover"
          fill
          className="object-cover"
          priority
        />
      </div>

      <p className="text-gray-700">
        In this module you’ll learn the fundamentals of EMI in PV systems, how
        to design and install to minimize radiated emissions, and review
        real-world case studies.
      </p>

      <Link href="/demo/lesson">
        <button className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 mt-10">
          Start Learning
        </button>
      </Link>
    </div>
  );
}
