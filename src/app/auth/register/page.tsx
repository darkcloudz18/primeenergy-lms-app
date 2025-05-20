// src/app/auth/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

export default function RegisterPage() {
  const supabase = useSupabaseClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "tutor" | "admin">("student");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1) Sign up the user via Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email,
        password,
        options: { data: { role } },
      }
    );

    if (signUpError && signUpError.message !== "User already registered") {
      alert("Error signing up: " + signUpError.message);
      setLoading(false);
      return;
    }

    // 2) Determine the user object (new or existing)
    const user =
      signUpData?.user ?? (await supabase.auth.getSession()).data.session?.user;

    if (!user) {
      alert("Could not retrieve user. Please sign in.");
      setLoading(false);
      router.push("/auth/login");
      return;
    }

    // 3) Call our serverless API to insert into `profiles` (service role)
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        role,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      alert("Error saving profile: " + json.error);
      setLoading(false);
      return;
    }

    // 4) Success
    setLoading(false);
    alert("Registration successful!");
    // Redirect based on role
    if (role === "admin") {
      router.push("/admin");
    } else if (role === "tutor") {
      router.push("/dashboard/tutor");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow mt-12">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block font-medium">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block font-medium mb-1">Role</label>
          <select
            value={role}
            onChange={(e) =>
              setRole(e.currentTarget.value as "student" | "tutor")
            }
            className="w-full border rounded px-3 py-2"
          >
            <option value="student">Student</option>
            <option value="tutor">Tutor</option>
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Registering…" : "Register"}
        </button>
      </form>
      <p className="mt-4 text-sm text-center">
        Already have an account?{" "}
        <a href="/auth/login" className="text-green-600 hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
