import Head from "next/head";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <>
      <Head>
        <title>Prime University - Empower Your Solar Knowledge</title>
      </Head>

      <main className="bg-white text-gray-800">
        {/* Hero Section */}
        <section className="bg-[#f6fefb] py-20 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold text-[#03BF63] mb-4">
              Empower Your Solar Knowledge ☀️
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-6">
              Master the science of solar energy through engaging courses,
              expert insights, and hands-on training.
            </p>
            <Link
              href="/courses"
              className="inline-block bg-[#03BF63] text-white px-6 py-3 rounded hover:bg-[#02a957] transition"
            >
              View Courses
            </Link>
          </div>
        </section>

        {/* Featured Courses */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl font-semibold mb-10">Featured Courses</h2>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="border rounded-lg p-6 shadow hover:shadow-md transition"
                >
                  <Image
                    src={`/course${n}.jpg`}
                    alt={`Course ${n}`}
                    width={400}
                    height={250}
                    className="rounded mb-4 w-full h-[200px] object-cover"
                  />
                  <h3 className="text-xl font-bold mb-2">Course Title {n}</h3>
                  <p className="text-gray-600 mb-4">
                    Short description about this course.
                  </p>
                  <Link
                    href="/demo"
                    className="text-[#03BF63] font-medium hover:underline"
                  >
                    Learn More →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 px-4 bg-[#f9fafb]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-semibold mb-8">
              Why Choose Prime University?
            </h2>
            <ul className="grid sm:grid-cols-2 gap-8 text-left">
              <li>✅ Certified industry instructors</li>
              <li>✅ Self-paced and live courses</li>
              <li>✅ Hands-on projects & quizzes</li>
              <li>✅ Certificate upon completion</li>
            </ul>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 px-4 text-center bg-[#03BF63] text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Learning?</h2>
          <p className="mb-6">
            Join thousands of learners powering their solar energy future.
          </p>
          <Link
            href="/register"
            className="bg-white text-[#03BF63] px-6 py-3 rounded font-medium hover:bg-gray-100 transition"
          >
            Get Started
          </Link>
        </section>
      </main>
    </>
  );
}
