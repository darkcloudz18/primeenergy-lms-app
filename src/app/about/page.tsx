// src/app/about/page.tsx
"use client";

import Head from "next/head";
import Link from "next/link";
// (Optional) If you add images later:
// import Image from "next/image";

export default function About() {
  return (
    <>
      <Head>
        <title>About • Prime Energy Solar</title>
      </Head>

      <main className="bg-white text-gray-800">
        {/* Hero Section */}
        <section className="bg-[#f6fefb] py-20 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold text-[#03BF63] mb-4">
              About Prime Energy Solar
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-6">
              Trusted solar experts in Connecticut and New England — delivering
              clean, reliable, and sustainable energy solutions.
            </p>
            <Link
              href="/courses"
              className="inline-block bg-[#03BF63] text-white px-6 py-3 rounded hover:bg-[#02a957] transition"
            >
              View Courses
            </Link>
          </div>
        </section>

        {/* Our Company */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-semibold text-center mb-10">
              Our Company
            </h2>

            <div className="max-w-4xl mx-auto space-y-4 text-lg text-gray-700">
              <p>
                Prime Energy Solar is one of the best solar companies in
                Connecticut, specializing in harnessing solar power to provide
                renewable energy for homes through solar panels.
              </p>
              <p>
                Our wide range of services is designed to maximize solar energy
                production, ensuring our clients have a consistent source of
                clean, abundant, and sustainable energy.
              </p>
              <p>
                We have proudly served New England and all of Connecticut for
                over 5 years and counting. Our proven track record in delivering
                high-quality solar solutions speaks for itself.
              </p>
              <p>
                Our commitment to excellence in delivering solar solutions has
                established us as a trusted choice in the solar power industry.
              </p>
            </div>
          </div>
        </section>

        {/* Our Commitment */}
        <section className="py-16 px-4 bg-[#f9fafb]">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-semibold text-center mb-8">
              Our Commitment
            </h2>

            <div className="max-w-4xl mx-auto space-y-6 text-gray-700">
              <p className="text-lg">
                We’re a family of highly trained professionals dedicated to a
                seamless solar installation experience. We go above and beyond
                to optimize sunlight absorption, partnering with industry
                leaders to deliver services tailored to your unique needs.
              </p>

              <ul className="grid sm:grid-cols-2 gap-8 text-left">
                <li className="border rounded-lg p-6 bg-white shadow-sm">
                  <h3 className="font-semibold mb-2">Expert tree-cutting</h3>
                  <p className="text-gray-600">
                    Enhance your roof’s sunlight exposure to maximize energy
                    production.
                  </p>
                </li>
                <li className="border rounded-lg p-6 bg-white shadow-sm">
                  <h3 className="font-semibold mb-2">Top-Notch Roofing</h3>
                  <p className="text-gray-600">
                    Keep your roof in prime condition for secure panel placement
                    in any weather.
                  </p>
                </li>
                <li className="border rounded-lg p-6 bg-white shadow-sm">
                  <h3 className="font-semibold mb-2">
                    Personalized Air Conditioning
                  </h3>
                  <p className="text-gray-600">
                    Tailored AC/heating solutions for year-round home comfort.
                  </p>
                </li>
                <li className="border rounded-lg p-6 bg-white shadow-sm">
                  <h3 className="font-semibold mb-2">Customer-First Care</h3>
                  <p className="text-gray-600">
                    Clear communication, transparent timelines, and responsive
                    support.
                  </p>
                </li>
              </ul>

              <p className="text-lg">
                At Prime Energy Solar, we don’t just meet your solar energy
                needs; we elevate your home comfort. Experience the Prime Energy
                Solar difference today!
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 px-4 text-center bg-[#03BF63] text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Go Solar?</h2>
          <p className="mb-6">
            Talk to our team or explore courses to get started with confidence.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/contact"
              className="bg-white text-[#03BF63] px-6 py-3 rounded font-medium hover:bg-gray-100 transition"
            >
              Contact Us
            </Link>
            <Link
              href="/courses"
              className="border border-white px-6 py-3 rounded font-medium hover:bg-white hover:text-[#03BF63] transition"
            >
              Explore Courses
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
