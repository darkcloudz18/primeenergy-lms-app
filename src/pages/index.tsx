// src/pages/index.tsx
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { GetServerSideProps } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type CourseCard = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  level: string | null;
  tag: string | null;
  created_at: string;
};

export const getServerSideProps: GetServerSideProps = async () => {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select(
      "id, title, description, image_url, category, level, tag, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(3);

  return {
    props: {
      courses: (data ?? []) as CourseCard[],
      hadError: Boolean(error),
    },
  };
};

export default function Home({
  courses,
  hadError,
}: {
  courses: CourseCard[];
  hadError: boolean;
}) {
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

        {/* Featured Courses (latest 3) */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl font-semibold mb-10">Featured Courses</h2>

            {hadError ? (
              <p className="text-gray-600">
                Couldn’t load courses right now. Please try again later.
              </p>
            ) : courses.length === 0 ? (
              <div className="text-gray-600">
                <p>No courses yet. Check back soon!</p>
                <div className="mt-6">
                  <Link
                    href="/courses"
                    className="text-[#03BF63] font-medium hover:underline"
                  >
                    Browse Courses →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((c) => {
                  const hasValidImage =
                    typeof c.image_url === "string" &&
                    /^https?:\/\//.test(c.image_url);

                  return (
                    <div
                      key={c.id}
                      className="border rounded-lg p-6 shadow hover:shadow-md transition text-left"
                    >
                      {/* Thumbnail */}
                      {hasValidImage ? (
                        <Image
                          src={c.image_url!}
                          alt={`Course ${c.title}`}
                          width={400}
                          height={250}
                          className="rounded mb-4 w-full h-[200px] object-cover"
                        />
                      ) : (
                        <div className="rounded mb-4 w-full h-[200px] bg-gray-100 grid place-items-center text-gray-400">
                          No image
                        </div>
                      )}

                      <h3 className="text-xl font-bold mb-2">{c.title}</h3>
                      {c.description && (
                        <p className="text-gray-600 mb-4 line-clamp-2">
                          {c.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 text-xs mb-4">
                        {c.category && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                            {c.category}
                          </span>
                        )}
                        {c.level && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {c.level}
                          </span>
                        )}
                        {c.tag && (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            {c.tag}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/courses/${c.id}`}
                        className="text-[#03BF63] font-medium hover:underline"
                      >
                        Learn More →
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
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
