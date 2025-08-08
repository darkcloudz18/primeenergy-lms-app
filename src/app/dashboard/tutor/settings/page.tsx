"use client";

import { useState, useEffect } from "react";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";
import type { UserProfile } from "@/lib/types";

interface Profile extends UserProfile {
  first_name: string;
  last_name: string;
}

export default function TutorSettingsPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const userId = session?.user?.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editField, setEditField] = useState<keyof Profile | null>(null);
  const [fieldValue, setFieldValue] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // load the profile on mount
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, role, created_at, first_name, last_name")
        .eq("id", userId)
        .single();
      if (!error && data) setProfile(data as Profile);
      setLoading(false);
    })();
  }, [supabase, userId]);

  // start editing a field
  const startEdit = (field: keyof Profile) => {
    if (!profile) return;
    setEditField(field);
    setFieldValue(String(profile[field]));
    setStatusMsg(null);
  };
  const cancelEdit = () => {
    setEditField(null);
    setFieldValue("");
    setStatusMsg(null);
  };

  // SAVE a single column via UPDATE (not upsert!)
  const saveField = async () => {
    if (!userId || !editField) return;
    setStatusMsg("Saving...");
    const { error } = await supabase
      .from("profiles")
      .update({ [editField]: fieldValue })
      .eq("id", userId);

    if (error) {
      setStatusMsg("Update failed: " + error.message);
    } else {
      setProfile((p) => p && { ...p, [editField]: fieldValue });
      setStatusMsg("Saved!");
      setEditField(null);
    }
  };

  // change password
  const changePassword = async () => {
    setStatusMsg(null);
    if (password !== confirmPassword) {
      setStatusMsg("Passwords do not match");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatusMsg("Password update failed: " + error.message);
    } else {
      setStatusMsg("Password updated!");
      setPassword("");
      setConfirmPassword("");
    }
  };

  if (loading) return <p className="p-6">Loading…</p>;
  if (!session) return <p className="p-6">Please sign in.</p>;
  if (!profile) return <p className="p-6">Profile not found.</p>;

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-semibold mb-6">My Profile</h1>

      <div className="space-y-6">
        {(["first_name", "last_name", "email"] as const).map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700">
              {field === "first_name"
                ? "First Name"
                : field === "last_name"
                ? "Last Name"
                : "Email"}
            </label>

            {editField === field ? (
              <div className="mt-1 flex items-center space-x-2">
                <input
                  className="border px-2 py-1 rounded flex-1"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                />
                <button
                  onClick={saveField}
                  className="text-green-600 hover:underline"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-red-600 hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-1 flex justify-between items-center">
                <p>{String(profile[field])}</p>
                <button
                  onClick={() => startEdit(field)}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        ))}

        <div className="pt-4 border-t">
          <h2 className="text-lg font-medium mb-2">Change Password</h2>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border px-2 py-1 rounded w-full mb-2"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="border px-2 py-1 rounded w-full mb-4"
          />
          <button
            onClick={changePassword}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Update Password
          </button>
        </div>

        {statusMsg && <p className="mt-4 text-sm text-gray-600">{statusMsg}</p>}
      </div>
    </div>
  );
}
