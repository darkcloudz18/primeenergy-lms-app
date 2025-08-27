// src/app/auth/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useSupabaseClient,
  useSessionContext,
} from "@supabase/auth-helpers-react";

export default function LoginPage() {
  const supabase = useSupabaseClient();
  const { session } = useSessionContext();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // forgot password UI
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      const role = (session.user.user_metadata.role as string) || "student";
      if (role === "admin") {
        router.replace("/admin/shre");
      } else if (role === "tutor") {
        router.replace("/dashboard/tutor");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      alert("Error signing in: " + error.message);
    }
    // Redirect happens via the useEffect once session is available.
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResetSending(true);
    try {
      const redirectTo = `${location.origin}/auth/reset`; // page in step 2
      const { error } = await supabase.auth.resetPasswordForEmail(
        (resetEmail || email).trim(),
        { redirectTo }
      );
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send reset";
      setErrorMsg(msg);
    } finally {
      setResetSending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow mt-12">
      <h1 className="text-2xl font-bold mb-4">Sign In</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      {/* Forgot password toggle */}
      <div className="mt-4 text-sm">
        <button
          className="text-blue-600 hover:underline"
          onClick={() => {
            setShowReset((s) => !s);
            setResetEmail(email);
          }}
        >
          {showReset ? "Hide password reset" : "Forgot password?"}
        </button>
      </div>

      {/* Reset panel */}
      {showReset && (
        <form onSubmit={handleSendReset} className="mt-3 space-y-3">
          <p className="text-gray-600 text-sm">
            Enter your email and we’ll send you a link to reset your password.
          </p>
          <input
            type="email"
            required
            value={resetEmail}
            onChange={(e) => setResetEmail(e.currentTarget.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="you@example.com"
          />
          <button
            type="submit"
            disabled={resetSending}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {resetSending ? "Sending…" : "Send reset link"}
          </button>
          {resetSent && (
            <p className="text-green-600 text-sm">
              Reset email sent. Please check your inbox.
            </p>
          )}
          {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
        </form>
      )}
    </div>
  );
}
