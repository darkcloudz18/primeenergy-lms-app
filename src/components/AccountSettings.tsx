// src/components/AccountSettings.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";

type Variant = "admin" | "tutor" | "student";

export default function AccountSettings({ variant }: { variant: Variant }) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const user = session?.user ?? null;
  const router = useRouter();

  // your hook currently returns { profile, loading }
  const { profile } = useProfile();

  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
  }, [profile?.first_name, profile?.last_name]);

  const heading = useMemo(() => {
    if (variant === "admin") return "Admin Settings";
    if (variant === "tutor") return "Tutor Settings";
    return "Account Settings";
  }, [variant]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">{heading}</h1>
        <p className="text-gray-600">Please sign in to manage your settings.</p>
      </div>
    );
  }

  const onSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErr(null);
    setProfileMsg(null);
    setSavingProfile(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfileMsg("Profile updated.");
      // If your header/page reads profile on server, this nudges it to re-read:
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not update profile.";
      setProfileErr(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassErr(null);
    setPassMsg(null);

    if (newPassword.length < 8) {
      setPassErr("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setPassErr("New password and confirmation do not match.");
      return;
    }

    setChangingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setPassMsg("Password changed successfully.");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not change password.";
      setPassErr(msg);
    } finally {
      setChangingPass(false);
    }
  };

  const email = user.email ?? "";

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">{heading}</h1>

      {/* Profile card */}
      <section className="bg-white rounded-lg shadow p-5 space-y-4">
        <h2 className="text-lg font-semibold">Profile</h2>
        <form onSubmit={onSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="mt-1 w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              First name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
              placeholder="e.g. Alice"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Last name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
              placeholder="e.g. Smith"
            />
          </div>

          {profileErr && <p className="text-sm text-red-600">{profileErr}</p>}
          {profileMsg && <p className="text-sm text-green-700">{profileMsg}</p>}

          <button
            type="submit"
            disabled={savingProfile}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {savingProfile ? "Saving…" : "Save changes"}
          </button>
        </form>
      </section>

      {/* Password card */}
      <section className="bg-white rounded-lg shadow p-5 space-y-4">
        <h2 className="text-lg font-semibold">Change Password</h2>
        <form onSubmit={onChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-200"
            />
          </div>

          {passErr && <p className="text-sm text-red-600">{passErr}</p>}
          {passMsg && <p className="text-sm text-green-700">{passMsg}</p>}

          <button
            type="submit"
            disabled={changingPass}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {changingPass ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}
