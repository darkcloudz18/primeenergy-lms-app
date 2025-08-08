// src/app/auth/register/page.tsx
"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function RegisterPage() {
  const supabase = createClientComponentClient();

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

    setLoading(true);

    // 1) sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email,
        password,
      }
    );

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // 2) get the new user's ID
    const userId = signUpData?.user?.id;
    if (!userId) {
      setError("Could not determine user ID.");
      setLoading(false);
      return;
    }

    // 3) call your route to insert into profiles
    const resp = await fetch("/api/create-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        firstName,
        lastName,
        email,
        role: "student",
      }),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      setError(body.error || `Profile creation failed: HTTP ${resp.status}`);
      setLoading(false);
      return;
    }

    // 4) success!
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white p-8 rounded shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4">Registration Submitted</h1>
          <p>
            Thanks <strong>{firstName}</strong>! Your account is pending
            approval.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start mt-10 justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-lg shadow-md w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold mb-6">Register</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="border px-3 py-2 rounded w-full"
            />
            <input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="border px-3 py-2 rounded w-full"
            />
          </div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border px-3 py-2 rounded w-full"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border px-3 py-2 rounded w-full"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="border px-3 py-2 rounded w-full"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded disabled:opacity-60"
          >
            {loading ? "Registering…" : "Register"}
          </button>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </form>
      </div>
    </div>
  );
}
