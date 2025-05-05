// src/app/auth/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "INSTRUCTOR">("STUDENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role,
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
    } else {
      router.push("/auth/login");
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Register</h1>
      {error && <p className="text-red-600">{error}</p>}
      <form onSubmit={handleRegister} className="space-y-4 text-gray-800">
        <div>
          <label className="block font-medium">First Name</label>
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-green-400"
          />
        </div>
        <div>
          <label className="block font-medium">Last Name</label>
          <input
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-green-400"
          />
        </div>
        <div>
          <label className="block font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-green-400"
          />
        </div>
        <div>
          <label className="block font-medium">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-green-400"
          />
        </div>
        <div>
          <label className="block font-medium">Role</label>
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "STUDENT" | "INSTRUCTOR")
            }
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-green-400"
          >
            <option value="STUDENT">Student</option>
            <option value="INSTRUCTOR">Instructor</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Registering…" : "Register"}
        </button>
      </form>
    </div>
  );
}
