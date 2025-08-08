// app/dashboard/student/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

export default function StudentSettingsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editField, setEditField] = useState<keyof Omit<Profile, "id"> | null>(
    null
  );
  const [fieldValue, setFieldValue] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldMsg, setFieldMsg] = useState<string | null>(null);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  // Load profile on mount
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/auth/login");
        return;
      }
      const userId = session.user.id;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("id", userId)
        .single();
      if (error) {
        console.error("Failed to load profile:", error.message);
      } else {
        setProfile(data);
      }
      setLoading(false);
    })();
  }, [supabase, router]);

  if (loading) return <p>Loading…</p>;
  if (!profile) return <p>Could not load your profile.</p>;

  // Begin editing a field
  const startEdit = (field: keyof Omit<Profile, "id">) => {
    setEditField(field);
    setFieldValue(profile[field] || "");
    setFieldMsg(null);
  };
  // Cancel edit
  const cancelEdit = () => {
    setEditField(null);
    setFieldValue("");
    setFieldMsg(null);
  };
  // Save updated field
  const saveField = async () => {
    if (!editField) return;
    setFieldMsg("Saving…");
    const { error } = await supabase
      .from("profiles")
      .update({ [editField]: fieldValue })
      .eq("id", profile.id)
      .select()
      .single();
    if (error) {
      setFieldMsg("Update failed: " + error.message);
    } else {
      setProfile({ ...profile, [editField]: fieldValue });
      setFieldMsg("Saved!");
      cancelEdit();
    }
  };

  // Change password
  const updatePassword = async () => {
    setPwMsg(null);
    if (newPassword !== confirmPassword) {
      setPwMsg("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPwMsg("Must be at least 8 characters");
      return;
    }
    setPwMsg("Updating…");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwMsg("Password update failed: " + error.message);
    } else {
      setPwMsg("Password updated");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">My Profile</h1>

      {/* First Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium">First Name</label>
        {editField === "first_name" ? (
          <div className="flex items-center">
            <input
              type="text"
              className="border rounded px-2 py-1 flex-1"
              value={fieldValue}
              onChange={(e) => setFieldValue(e.target.value)}
            />
            <button
              onClick={saveField}
              className="ml-2 text-green-600 font-medium"
            >
              Save
            </button>
            <button
              onClick={cancelEdit}
              className="ml-1 text-red-500 font-medium"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <span>{profile.first_name}</span>
            <button
              onClick={() => startEdit("first_name")}
              className="text-blue-600 hover:underline text-sm"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Last Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium">Last Name</label>
        {editField === "last_name" ? (
          <div className="flex items-center">
            <input
              type="text"
              className="border rounded px-2 py-1 flex-1"
              value={fieldValue}
              onChange={(e) => setFieldValue(e.target.value)}
            />
            <button
              onClick={saveField}
              className="ml-2 text-green-600 font-medium"
            >
              Save
            </button>
            <button
              onClick={cancelEdit}
              className="ml-1 text-red-500 font-medium"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <span>{profile.last_name}</span>
            <button
              onClick={() => startEdit("last_name")}
              className="text-blue-600 hover:underline text-sm"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Email */}
      <div className="mb-6">
        <label className="block text-sm font-medium">Email</label>
        {editField === "email" ? (
          <div className="flex items-center">
            <input
              type="email"
              className="border rounded px-2 py-1 flex-1"
              value={fieldValue}
              onChange={(e) => setFieldValue(e.target.value)}
            />
            <button
              onClick={saveField}
              className="ml-2 text-green-600 font-medium"
            >
              Save
            </button>
            <button
              onClick={cancelEdit}
              className="ml-1 text-red-500 font-medium"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <span>{profile.email}</span>
            <button
              onClick={() => startEdit("email")}
              className="text-blue-600 hover:underline text-sm"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Field messages */}
      {fieldMsg && <p className="text-sm text-gray-600 mb-4">{fieldMsg}</p>}

      <hr className="my-6" />

      <h2 className="text-xl font-semibold mb-2">Change Password</h2>
      <div className="space-y-3">
        <input
          type="password"
          placeholder="New password"
          className="block w-full border rounded px-2 py-1"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="Confirm password"
          className="block w-full border rounded px-2 py-1"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <button
          onClick={updatePassword}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          Update Password
        </button>
        {pwMsg && <p className="text-sm text-gray-600">{pwMsg}</p>}
      </div>
    </div>
  );
}
