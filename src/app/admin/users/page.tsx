// src/app/admin/users/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type Role = "student" | "tutor" | "admin" | "super admin";
type Status = "pending" | "active" | "suspended";

type AdminUser = {
  id: string;
  email: string | null;
  created_at: string | null;
  first_name: string | null;
  last_name: string | null;
  role: Role | null;
  status: Status | null;
};

type Editable = {
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  status: Status;
  password?: string;
};

const ROLE_OPTIONS: Role[] = ["student", "tutor", "admin", "super admin"];
const STATUS_OPTIONS: Status[] = ["pending", "active", "suspended"];

export default function AdminUsersPage() {
  const supabase = createClientComponentClient();

  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [filterRole, setFilterRole] = useState<Role | "">("");
  const [filterStatus, setFilterStatus] = useState<Status | "">("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Editable | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // fresh load (no HTTP cache)
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { users: AdminUser[] };
      setRows(json.users ?? []);
    } catch (e: unknown) {
      console.error("AdminUsers: load error", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void load(), [load]);

  // realtime sync for inserts/updates/deletes in public.profiles
  useEffect(() => {
    const channel = supabase
      .channel("profiles-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload: RealtimePostgresChangesPayload<AdminUser>) => {
          const type = payload.eventType;
          if (type === "INSERT") {
            const u = payload.new as AdminUser;
            setRows((prev) => [u, ...prev.filter((r) => r.id !== u.id)]);
          } else if (type === "UPDATE") {
            const u = payload.new as AdminUser;
            setRows((prev) => prev.map((r) => (r.id === u.id ? u : r)));
          } else if (type === "DELETE") {
            const u = payload.old as AdminUser;
            setRows((prev) => prev.filter((r) => r.id !== u.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // editing helpers
  const startEdit = (u: AdminUser) => {
    setEditingId(u.id);
    setForm({
      first_name: u.first_name ?? "",
      last_name: u.last_name ?? "",
      email: u.email ?? "",
      role: (u.role ?? "student") as Role,
      status: (u.status ?? "pending") as Status,
      password: "",
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm(null);
  };

  const saveEdit = async (id: string) => {
    if (!form) return;
    setSaving(true);
    try {
      const body = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        role: form.role,
        status: form.status,
        email: form.email.trim(),
        password: form.password?.trim() ? form.password.trim() : undefined,
      };

      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await load();
      cancelEdit();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Save failed";
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Delete this user? This removes auth + profile.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  // filters
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterRole && (r.role ?? "") !== filterRole) return false;
      if (filterStatus && (r.status ?? "") !== filterStatus) return false;
      if (!q) return true;

      const full = `${r.first_name ?? ""} ${r.last_name ?? ""}`
        .toLowerCase()
        .trim();

      return (
        full.includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.role ?? "").toLowerCase().includes(q) ||
        (r.status ?? "").toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }, [rows, query, filterRole, filterStatus]);

  return (
    <main className="max-w-8xl mx-auto p-6 space-y-6">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Users</h1>
          <button
            onClick={load}
            className="px-3 py-1 rounded bg-white border hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-lg shadow">
          <input
            className="border rounded px-3 py-2"
            placeholder="Search by name, email, role, status, id…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="border rounded px-3 py-2"
            value={filterRole}
            onChange={(e) => setFilterRole((e.target.value || "") as Role | "")}
          >
            <option value="">All roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            className="border rounded px-3 py-2"
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus((e.target.value || "") as Status | "")
            }
          >
            <option value="">All status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Table */}
      <section className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>

          {loading ? (
            <tbody>
              <tr>
                <td className="px-4 py-6 text-gray-600" colSpan={6}>
                  Loading users…
                </td>
              </tr>
            </tbody>
          ) : filtered.length === 0 ? (
            <tbody>
              <tr>
                <td className="px-4 py-6 text-gray-600" colSpan={6}>
                  No users match those filters.
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="divide-y">
              {filtered.map((u) => {
                const isEditing = editingId === u.id;
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    {/* Name */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <input
                            className="border rounded px-2 py-1"
                            placeholder="First"
                            value={form?.first_name ?? ""}
                            onChange={(e) =>
                              setForm((f) =>
                                f ? { ...f, first_name: e.target.value } : f
                              )
                            }
                          />
                          <input
                            className="border rounded px-2 py-1"
                            placeholder="Last"
                            value={form?.last_name ?? ""}
                            onChange={(e) =>
                              setForm((f) =>
                                f ? { ...f, last_name: e.target.value } : f
                              )
                            }
                          />
                        </div>
                      ) : (
                        <div className="font-medium">
                          {`${u.first_name ?? ""} ${
                            u.last_name ?? ""
                          }`.trim() || "—"}
                        </div>
                      )}
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          className="border rounded px-2 py-1 w-64"
                          placeholder="Email"
                          type="email"
                          value={form?.email ?? ""}
                          onChange={(e) =>
                            setForm((f) =>
                              f ? { ...f, email: e.target.value } : f
                            )
                          }
                        />
                      ) : (
                        <span>{u.email ?? "—"}</span>
                      )}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          className="border rounded px-2 py-1"
                          value={form?.role ?? "student"}
                          onChange={(e) =>
                            setForm((f) =>
                              f ? { ...f, role: e.target.value as Role } : f
                            )
                          }
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-block bg-gray-100 px-2 py-1 rounded">
                          {u.role ?? "student"}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          className="border rounded px-2 py-1"
                          value={form?.status ?? "pending"}
                          onChange={(e) =>
                            setForm((f) =>
                              f ? { ...f, status: e.target.value as Status } : f
                            )
                          }
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-block bg-gray-100 px-2 py-1 rounded">
                          {u.status ?? "pending"}
                        </span>
                      )}
                    </td>

                    {/* ID */}
                    <td className="px-4 py-3 text-gray-500">
                      <code className="text-xs">{u.id}</code>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2 items-center">
                        {isEditing ? (
                          <>
                            <input
                              className="border rounded px-2 py-1 w-48"
                              type="password"
                              placeholder="New password (optional)"
                              value={form?.password ?? ""}
                              onChange={(e) =>
                                setForm((f) =>
                                  f ? { ...f, password: e.target.value } : f
                                )
                              }
                            />
                            <button
                              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                              onClick={cancelEdit}
                              disabled={saving}
                            >
                              Cancel
                            </button>
                            <button
                              className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                              onClick={() => saveEdit(u.id)}
                              disabled={saving}
                            >
                              {saving ? "Saving…" : "Save"}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="px-3 py-1 rounded bg-white border hover:bg-gray-50"
                              onClick={() => startEdit(u)}
                            >
                              Edit
                            </button>
                            <button
                              className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                              onClick={() => deleteUser(u.id)}
                              disabled={deletingId === u.id}
                            >
                              {deletingId === u.id ? "Deleting…" : "Delete"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
      </section>
    </main>
  );
}
