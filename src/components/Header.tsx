// src/components/Header.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import {
  useSessionContext,
  useSupabaseClient,
} from "@supabase/auth-helpers-react";

type Role = "student" | "tutor" | "admin" | "super admin" | null;

type SupabaseUserMetadata = {
  role?: string;
  name?: string;
  full_name?: string;
  [key: string]: unknown;
};

interface ProfileRow {
  role?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface UserRow {
  role?: string | null;
}

const normalizeRole = (raw?: string | null): Role => {
  if (!raw) return null;
  const cleaned = raw
    .toLowerCase()
    .replace(/[_\s-]+/g, " ")
    .trim();
  if (["super admin", "superadmin", "super_admin"].includes(cleaned))
    return "super admin";
  if (["admin", "administrator"].includes(cleaned)) return "admin";
  if (["tutor"].includes(cleaned)) return "tutor";
  if (["student", "learner"].includes(cleaned)) return "student";
  return null;
};

const isProfileRow = (x: unknown): x is ProfileRow =>
  typeof x === "object" &&
  x !== null &&
  ("role" in (x as object) ||
    "first_name" in (x as object) ||
    "last_name" in (x as object));

const isUserRow = (x: unknown): x is UserRow =>
  typeof x === "object" && x !== null && "role" in (x as object);

export default function Header() {
  const { session } = useSessionContext();
  const supabase = useSupabaseClient();
  const pathname = usePathname();
  const router = useRouter();

  const [role, setRole] = useState<Role>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState<boolean>(true);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch role + name
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!session?.user) {
        if (!cancelled) {
          setRole(null);
          setDisplayName(null);
          setLoadingRole(false);
        }
        return;
      }

      setLoadingRole(true);
      const userId = session.user.id;

      let resolvedRole: Role | null = null;
      let name: string | null = null;

      // 1) profiles
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("role, first_name, last_name")
        .eq("id", userId)
        .maybeSingle();

      if (!profileErr && isProfileRow(profileData)) {
        if (typeof profileData.role === "string") {
          resolvedRole = normalizeRole(profileData.role);
        }
        const first =
          typeof profileData.first_name === "string"
            ? profileData.first_name
            : "";
        const last =
          typeof profileData.last_name === "string"
            ? profileData.last_name
            : "";
        if (first || last) {
          name = [first, last].filter(Boolean).join(" ");
        }
      }

      // 2) fallback: users table (if you maintain a role there)
      if (!resolvedRole) {
        const { data: userData, error: userErr } = await supabase
          .from("users")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (
          !userErr &&
          isUserRow(userData) &&
          typeof userData.role === "string"
        ) {
          resolvedRole = normalizeRole(userData.role);
        }
      }

      // 3) fallback: auth user_metadata
      if (!resolvedRole) {
        const metadata = session.user.user_metadata as SupabaseUserMetadata;
        const rawMetaRole =
          typeof metadata?.role === "string" ? metadata.role : null;
        resolvedRole = normalizeRole(rawMetaRole);
      }

      // Name fallback
      if (!name) {
        const metadata = session.user.user_metadata as SupabaseUserMetadata;
        const metaName =
          (typeof metadata.full_name === "string" && metadata.full_name) ||
          (typeof metadata.name === "string" && metadata.name);
        if (metaName) {
          name = metaName;
        } else {
          name = session.user.email ?? null;
        }
      }

      if (!cancelled) {
        setRole(resolvedRole);
        setDisplayName(name);
        setLoadingRole(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [session, supabase]);

  const isAdmin = role === "admin" || role === "super admin";
  const isTutor = role === "tutor";
  const isStudent = role === "student";

  // Route to the correct dashboard
  const dashboardHref = useMemo(() => {
    if (isAdmin) return "/admin";
    if (isTutor) return "/dashboard/tutor";
    if (isStudent) return "/dashboard/student";
    // signed in but no explicit role → student dashboard by default
    return session ? "/dashboard/student" : "/auth";
  }, [isAdmin, isTutor, isStudent, session]);

  const dashboardLabel = isAdmin
    ? "Admin Dashboard"
    : isTutor
    ? "Tutor Dashboard"
    : "My Dashboard";

  const firstName = useMemo(() => {
    if (!displayName) return null;
    return displayName.split(" ")[0] || displayName;
  }, [displayName]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const navItems: { label: string; href: string }[] = [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about" },
    { label: "Courses", href: "/courses" },
  ];

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/logo.png"
            alt="Prime University"
            width={180}
            height={45}
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center space-x-6 font-medium text-lg flex-nowrap">
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

          {/* Dashboard link (role-aware) */}
          {session &&
            (loadingRole ? (
              <span className="text-gray-700">Loading…</span>
            ) : (
              <Link
                href={dashboardHref}
                className={clsx(
                  "text-gray-700 hover:text-green-600 hover:underline",
                  pathname === dashboardHref && "text-green-600 underline"
                )}
              >
                {dashboardLabel}
              </Link>
            ))}

          {/* Quick admin links (optional)
          {isAdmin && !loadingRole && (
            <>
              <Link
                href="/admin/courses"
                className={clsx(
                  "text-gray-700 hover:text-green-600 hover:underline",
                  pathname === "/admin/courses" && "text-green-600 underline"
                )}
              >
                Manage Courses
              </Link>
              <Link
                href="/admin/users"
                className={clsx(
                  "text-gray-700 hover:text-green-600 hover:underline",
                  pathname === "/admin/users" && "text-green-600 underline"
                )}
              >
                Users
              </Link>
            </>
          )} */}

          {/* Greeting */}
          {session && !loadingRole && firstName && (
            <span className="text-base lg:text-lg text-gray-700 ml-2">
              Hi, {firstName}
            </span>
          )}

          {/* Auth buttons */}
          {!session ? (
            <>
              <button
                onClick={() => router.push("/auth/login")}
                className="text-gray-700 hover:text-green-600 text-lg"
              >
                Sign In
              </button>
              <Link
                href="/auth/register"
                className="text-gray-700 hover:text-green-600 text-lg"
              >
                Register
              </Link>
            </>
          ) : (
            <button
              onClick={handleSignOut}
              className="text-gray-700 hover:text-red-600 text-lg"
            >
              Sign Out
            </button>
          )}
        </nav>

        {/* Mobile toggle */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            aria-label="menu"
            onClick={() => setIsOpen((o) => !o)}
            className="p-2 border rounded text-lg"
          >
            {isOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="lg:hidden border-t bg-white px-4 py-3 space-y-2">
          {session && !loadingRole && firstName && (
            <div className="pb-2 border-b text-base font-medium">
              Hi, {firstName}
            </div>
          )}

          {navItems.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "block text-lg font-medium hover:underline",
                pathname === href && "underline"
              )}
              onClick={() => setIsOpen(false)}
            >
              {label}
            </Link>
          ))}

          {session &&
            (loadingRole ? (
              <div className="block text-lg font-medium text-gray-700">
                Loading…
              </div>
            ) : (
              <Link
                href={dashboardHref}
                className={clsx(
                  "block text-lg font-medium hover:underline",
                  pathname === dashboardHref && "underline"
                )}
                onClick={() => setIsOpen(false)}
              >
                {dashboardLabel}
              </Link>
            ))}

          {/* {isAdmin && !loadingRole && (
            <>
              <Link
                href="/admin/courses"
                className={clsx(
                  "block text-lg font-medium hover:underline",
                  pathname === "/admin/courses" && "underline"
                )}
                onClick={() => setIsOpen(false)}
              >
                Manage Courses
              </Link>
              <Link
                href="/admin/users"
                className={clsx(
                  "block text-lg font-medium hover:underline",
                  pathname === "/admin/users" && "underline"
                )}
                onClick={() => setIsOpen(false)}
              >
                Users
              </Link>
            </>
          )} */}

          {!session ? (
            <>
              <button
                onClick={() => {
                  router.push("/auth/login");
                  setIsOpen(false);
                }}
                className="block text-lg font-medium hover:underline"
              >
                Sign In
              </button>
              <Link
                href="/auth/register"
                className="block text-lg font-medium hover:underline"
                onClick={() => setIsOpen(false)}
              >
                Register
              </Link>
            </>
          ) : (
            <button
              onClick={() => {
                handleSignOut();
                setIsOpen(false);
              }}
              className="block text-lg font-medium text-red-600 hover:underline"
            >
              Sign Out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
