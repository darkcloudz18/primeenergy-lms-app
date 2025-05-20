// src/components/Header.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";
import {
  useSessionContext,
  useSupabaseClient,
} from "@supabase/auth-helpers-react";

export default function Header() {
  const { session } = useSessionContext();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // 1) Compute dashboard URL based on role
  const dashboardHref = session
    ? session.user.user_metadata.role === "admin"
      ? "/admin"
      : session.user.user_metadata.role === "tutor"
      ? "/dashboard/tutor"
      : "/dashboard"
    : "/auth/login";

  const navItems = [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about" },
    { label: "Courses", href: "/courses" },
  ];

  // 2) Sign-out handler
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Image src="/logo.png" alt="Logo" width={160} height={40} />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center space-x-6 font-medium">
          {navItems.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "text-gray-700 hover:text-green-600 hover:underline",
                pathname === href && "text-green-600 underline"
              )}
            >
              {label}
            </Link>
          ))}

          {/* Dynamic My Dashboard link */}
          <Link
            href={dashboardHref}
            className={clsx(
              "text-gray-700 hover:text-green-600 hover:underline",
              pathname === dashboardHref && "text-green-600 underline"
            )}
          >
            My Dashboard
          </Link>

          {/* Auth Buttons */}
          {!session ? (
            <>
              <button
                onClick={() => router.push("/auth/login")}
                className="text-gray-700 hover:text-green-600"
              >
                Sign In
              </button>
              <Link
                href="/auth/register"
                className="text-gray-700 hover:text-green-600"
              >
                Register
              </Link>
            </>
          ) : (
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Hi, {session.user.email}</span>
              <button
                onClick={handleSignOut}
                className="text-red-600 hover:text-red-800"
              >
                Sign Out
              </button>
            </div>
          )}
        </nav>

        {/* Mobile Hamburger */}
        <div className="lg:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle Menu"
            className="text-gray-700"
          >
            {/* ...svg icons... */}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="lg:hidden bg-white shadow-md px-4 pb-4 space-y-2">
          {navItems.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "block text-gray-700 hover:text-green-600 hover:underline",
                pathname === href && "text-green-600 underline"
              )}
            >
              {label}
            </Link>
          ))}

          <Link
            href={dashboardHref}
            className={clsx(
              "block text-gray-700 hover:text-green-600 hover:underline",
              pathname === dashboardHref && "text-green-600 underline"
            )}
          >
            My Dashboard
          </Link>

          {!session ? (
            <>
              <button
                onClick={() => router.push("/auth/login")}
                className="block text-gray-700 hover:text-green-600"
              >
                Sign In
              </button>
              <Link
                href="/auth/register"
                className="block text-gray-700 hover:text-green-600"
              >
                Register
              </Link>
            </>
          ) : (
            <>
              <span className="block text-gray-700">
                Hi, {session.user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="block text-red-600 hover:text-red-800"
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
