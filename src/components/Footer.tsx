import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-100 text-gray-700 mt-10 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Logo and Tagline */}
        <div>
          <Link href="/" className="text-2xl font-bold text-[#03BF63]">
            Primeenergy Solar LMS
          </Link>
          <p className="mt-2 text-sm text-gray-500">
            Empowering your learning journey.
          </p>
        </div>

        {/* Navigation */}
        <div>
          <h3 className="font-semibold mb-2">Quick Links</h3>
          <ul className="space-y-1 text-sm">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/about">About Us</Link>
            </li>
            <li>
              <Link href="/courses">Courses</Link>
            </li>
            <li>
              <Link href="/dashboard">Dashboard</Link>
            </li>
          </ul>
        </div>

        {/* Contact / Social */}
        <div>
          <h3 className="font-semibold mb-2">Connect</h3>
          <ul className="space-y-1 text-sm">
            <li>Email: contact@primeenergy.com</li>
            <li>Phone: +63 912 345 6789</li>
            <li className="flex space-x-3 mt-2">
              <a href="#" className="hover:text-[#03BF63]">
                Facebook
              </a>
              <a href="#" className="hover:text-[#03BF63]">
                Twitter
              </a>
              <a href="#" className="hover:text-[#03BF63]">
                LinkedIn
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="text-center py-4 text-sm border-t border-gray-200">
        &copy; {new Date().getFullYear()} Primeenergy Solar LMS. All rights
        reserved.
      </div>
    </footer>
  );
}
