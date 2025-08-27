// src/app/auth/reset/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

export default function ResetPasswordPage() {
  const supabase = useSupabaseClient();
  const router = useRouter();

  const [ready, setReady] = useState(false); // show form when we have a session from the link
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // When user clicks the email link, Supabase includes a recovery access token in the URL.
    // The auth-helpers will hydrate session on first call; we then show the form.
    let unsub = supabase.auth.onAuthStateChange((event) => {
      // PASSWORD_RECOVERY or SIGNED_IN after link
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    }).data.subscription;

    // Also attempt to get session immediately (in case it's already set)
    supabase.auth.getSession().then(() => setReady(true));

    return () => {
      unsub?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    // optional: redirect after a moment
    // setTimeout(() => router.replace("/auth/login"), 1200);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white p-8 rounded shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold mb-3">Password updated</h1>
          <p className="mb-4">You can now sign in with your new password.</p>
          <button
            onClick={() => router.replace("/auth/login")}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Reset your password</h1>

        {!ready ? (
          <p className="text-gray-600">Preparing secure reset…</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block font-medium">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                className="mt-1 w-full border rounded px-3 py-2"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block font-medium">Confirm new password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.currentTarget.value)}
                className="mt-1 w-full border rounded px-3 py-2"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Updating…" : "Update password"}
            </button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
