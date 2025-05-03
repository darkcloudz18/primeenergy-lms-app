"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import clsx from "clsx";

const navItems = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Courses", href: "/courses" },
  { label: "My Dashboard", href: "/dashboard" },
];

export default function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/logo.png"
            alt="Prime University Logo"
            width={160}
            height={40}
          />
        </Link>

        {/* Mobile Hamburger */}
        <div className="lg:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-700 focus:outline-none"
            aria-label="Toggle Menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex space-x-6 font-medium">
          {navItems.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "text-gray-700 hover:text-[#03BF63] hover:underline underline-offset-8 decoration-2",
                pathname === href &&
                  "text-[#03BF63] underline underline-offset-8"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="lg:hidden bg-white shadow-md px-4 pb-4 space-y-2">
          {navItems.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "block text-gray-700 hover:text-[#03BF63] hover:underline underline-offset-4 decoration-2",
                pathname === href && "text-[#03BF63] underline"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
