"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function RegisterPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    const { error: signUpError, data: signUpData } = await supabase.auth.signUp(
      {
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: "student",
          },
        },
      }
    );

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id || signUpData?.user?.id;

    if (!userId) {
      setError("Could not determine user ID after signup.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      role: "student",
      email,
      status: "pending",
    });

    if (profileError) {
      setError("Failed to create profile: " + profileError.message);
      setLoading(false);
      return;
    }

    try {
      await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          firstName,
          lastName,
          email,
        }),
      });
    } catch (notifyErr) {
      console.error("Failed to notify admins:", notifyErr);
    }

    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white rounded-lg shadow-md w-full max-w-md p-8">
          <h1 className="text-2xl font-bold mb-4">Registration Submitted</h1>
          <p className="mb-2">
            Thank you, <span className="font-medium">{firstName}</span>. Your
            account is pending approval by an admin.
          </p>
          <p>
            Once approved you’ll receive a welcome email. If declined, you’ll
            get a notification with next steps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start mt-10 justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-lg shadow-md w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold mb-6">Register</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              aria-label="First name"
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="border px-3 py-2 rounded w-full"
            />
            <input
              aria-label="Last name"
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="border px-3 py-2 rounded w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border px-3 py-2 rounded w-full"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border px-3 py-2 rounded w-full"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="confirmPassword"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="border px-3 py-2 rounded w-full"
            />
          </div>
          <div className="hidden">
            <label className="block text-sm font-medium mb-1" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              value="student"
              disabled
              className="border px-3 py-2 rounded w-full bg-gray-50"
            >
              <option value="student">Student</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-green-600 hover:bg-green-700 transition-colors text-white font-medium px-4 py-3 rounded w-full disabled:opacity-60"
          >
            {loading ? "Registering…" : "Register"}
          </button>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <p className="text-center text-sm mt-1">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-green-600 font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
