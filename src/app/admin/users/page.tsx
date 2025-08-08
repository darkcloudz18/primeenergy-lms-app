"use client";

import { useEffect, useMemo, useState } from "react";

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
};

const ROLE_OPTIONS: Role[] = ["student", "tutor", "admin", "super admin"];
const STATUS_OPTIONS: Status[] = ["pending", "active", "suspended"];

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filterRole, setFilterRole] = useState<Role | "">("");
  const [filterStatus, setFilterStatus] = useState<Status | "">("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Editable | null>(null);
  const [saving, setSaving] = useState(false);

  // Load all users via admin API
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/users", { method: "GET" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as { users: AdminUser[] };
        if (!alive) return;
        setRows(json.users ?? []);
      } catch (err) {
        console.error("AdminUsers: fetch error", err);
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const startEdit = (u: AdminUser) => {
    setEditingId(u.id);
    setForm({
      first_name: u.first_name ?? "",
      last_name: u.last_name ?? "",
      email: u.email ?? "",
      role: u.role ?? "student",
      status: u.status ?? "pending",
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
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        role: form.role,
        status: form.status,
        email: form.email.trim(), // optional; server will update auth email
      };

      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      // optimistic update
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                first_name: payload.first_name || null,
                last_name: payload.last_name || null,
                role: payload.role,
                status: payload.status,
                email: payload.email || r.email,
              }
            : r
        )
      );

      cancelEdit();
    } catch (err) {
      console.error("AdminUsers: save error", err);
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Filters
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
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="space-y-4">
        <h1 className="text-2xl font-semibold">Users</h1>

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
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
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
                          <button
                            className="px-3 py-1 rounded bg-white border hover:bg-gray-50"
                            onClick={() => startEdit(u)}
                          >
                            Edit
                          </button>
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
