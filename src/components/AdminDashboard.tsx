// src/components/AdminDashboard.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import type { Course, UserProfile } from "@/lib/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPlus } from "@fortawesome/free-solid-svg-icons";

interface Props {
  initialCourses: Course[];
  initialUsers: UserProfile[];
}

export default function AdminDashboard({
  initialCourses,
  initialUsers,
}: Props) {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);

  // Delete Course
  async function deleteCourse(id: string) {
    if (!confirm("Delete this course?")) return;
    await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
    setCourses((c) => c.filter((x) => x.id !== id));
  }

  // Toggle user role
  async function toggleRole(u: UserProfile) {
    const newRole = u.role === "admin" ? "student" : "admin";
    const { user } = await fetch(`/api/admin/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    }).then((r) => r.json());
    setUsers((us) => us.map((x) => (x.id === u.id ? user : x)));
  }

  return (
    <div className="space-y-12 p-8">
      {/* Courses */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Courses</h2>
          {/* ← Instead of prompt(), link to your course+lesson form page */}
          <Link
            href="/admin/create-course"
            className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            New Course
          </Link>
        </div>

        <table className="w-full table-auto bg-white shadow rounded overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Title</th>
              <th className="p-2">Created</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">{c.title}</td>
                <td className="p-2">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => deleteCourse(c.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Users */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Users & Roles</h2>
        <table className="w-full table-auto bg-white shadow rounded overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Email</th>
              <th className="p-2">Role</th>
              <th className="p-2">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.email}</td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => toggleRole(u)}
                    className={
                      u.role === "admin"
                        ? "px-2 py-1 bg-blue-600 text-white rounded"
                        : "px-2 py-1 bg-gray-200 rounded"
                    }
                  >
                    {u.role}
                  </button>
                </td>
                <td className="p-2">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
