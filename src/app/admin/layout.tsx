// src/app/admin/layout.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useProfile } from "@/hooks/useProfile";
import type React from "react";
import {
  HomeIcon,
  PlusCircleIcon,
  RectangleStackIcon,
  UsersIcon,
  DocumentCheckIcon, // <- use this as the Certificates icon
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = useProfile();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const pathname = usePathname();

  const firstName = useMemo(() => {
    const first = (profile?.first_name || "Admin").trim();
    return first ? first[0]!.toUpperCase() + first.slice(1) : "Admin";
  }, [profile?.first_name]);

  const initial = firstName.charAt(0) || "A";

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const NavLink = ({
    href,
    label,
    Icon,
  }: {
    href: string;
    label: string;
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }) => (
    <Link
      href={href}
      className={`group flex items-center px-3 py-2 rounded hover:bg-gray-100 ${
        pathname === href ? "bg-gray-100 font-semibold" : ""
      }`}
    >
      <Icon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
      {label}
    </Link>
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <aside className="w-64 bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-6 flex items-center space-x-3">
          <div className="h-10 w-10 bg-green-600 text-white rounded-full grid place-items-center font-semibold">
            {initial}
          </div>
          <div>
            <h3 className="text-lg font-semibold">Hello, {firstName}</h3>
            <p className="text-xs text-gray-500">Admin Dashboard</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-1 text-gray-700">
          <NavLink href="/admin" label="Dashboard" Icon={HomeIcon} />
          <NavLink
            href="/admin/create-course"
            label="Create Course"
            Icon={PlusCircleIcon}
          />
          <NavLink
            href="/admin/courses"
            label="Manage Courses"
            Icon={RectangleStackIcon}
          />
          <NavLink href="/admin/users" label="Users" Icon={UsersIcon} />
          <NavLink
            href="/admin/certificates"
            label="Certificates"
            Icon={DocumentCheckIcon}
          />
          <NavLink
            href="/admin/settings"
            label="Settings"
            Icon={Cog6ToothIcon}
          />

          <button
            onClick={onLogout}
            className="w-full text-left group flex items-center px-3 py-2 rounded hover:bg-gray-100 mt-2"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-green-600" />
            Logout
          </button>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
