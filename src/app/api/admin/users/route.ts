import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "student" | "tutor" | "admin" | "super admin";
type Status = "pending" | "active" | "suspended";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  status: string | null;
  created_at: string;
};

type AdminUser = {
  id: string;
  email: string | null;
  created_at: string | null;
  first_name: string | null;
  last_name: string | null;
  role: Role | null;
  status: Status | null;
};

type AdminCheck = {
  ok: boolean;
  reason: "not-authenticated" | "forbidden" | null;
};

function normalizeRole(raw?: string | null): Role | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (s === "super admin" || s === "super_admin" || s === "superadmin")
    return "super admin";
  if (s === "admin") return "admin";
  if (s === "tutor") return "tutor";
  if (s === "student") return "student";
  return null;
}

function normalizeStatus(raw?: string | null): Status | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (s === "pending" || s === "active" || s === "suspended")
    return s as Status;
  return null;
}

async function requireAdmin(): Promise<AdminCheck> {
  // We don't actually need `req` here now, but we keep the param
  // to align with Next's handler signature and future-proofing.
  const client = createServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) return { ok: false, reason: "not-authenticated" };

  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin =
    profile?.role &&
    ["admin", "super admin", "super_admin", "superadmin"].includes(
      String(profile.role).toLowerCase()
    );

  return { ok: Boolean(isAdmin), reason: isAdmin ? null : "forbidden" };
}

export async function GET() {
  const check = await requireAdmin();
  if (!check.ok) {
    const status = check.reason === "not-authenticated" ? 401 : 403;
    return NextResponse.json({ error: check.reason }, { status });
  }

  // 1) List auth users
  const authList = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (authList.error) {
    return NextResponse.json(
      { error: authList.error.message },
      { status: 500 }
    );
  }

  const authUsers = authList.data.users.map((u) => ({
    id: u.id,
    email: u.email ?? null,
    created_at: u.created_at ?? null,
  }));

  const ids = authUsers.map((u) => u.id);
  if (ids.length === 0) {
    return NextResponse.json<{ users: AdminUser[] }>({ users: [] });
  }

  // 2) Profiles for those users
  const { data: profiles, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, role, status, created_at")
    .in("id", ids);

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  const map = new Map<string, ProfileRow>();
  (profiles ?? []).forEach((p) => map.set(p.id, p));

  // 3) Merge
  const users: AdminUser[] = authUsers.map((u) => {
    const p = map.get(u.id);
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      first_name: p?.first_name ?? null,
      last_name: p?.last_name ?? null,
      role: normalizeRole(p?.role ?? null),
      status: normalizeStatus(p?.status ?? null),
    };
  });

  return NextResponse.json<{ users: AdminUser[] }>({ users });
}
