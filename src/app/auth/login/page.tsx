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

  // Only redirect after React knows the session
  useEffect(() => {
    if (session) {
      const role = session.user.user_metadata.role as string;
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
      email,
      password,
    });
    setLoading(false);

    if (error) {
      alert("Error signing in: " + error.message);
    }
    // don’t manually push here — the useEffect above will catch the new session
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
    </div>
  );
}
