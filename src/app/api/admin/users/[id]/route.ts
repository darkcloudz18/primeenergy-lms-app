import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "student" | "tutor" | "admin" | "super admin";
type Status = "pending" | "active" | "suspended";

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

async function requireAdmin(req: NextRequest): Promise<AdminCheck> {
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const check = await requireAdmin(req);
  if (!check.ok) {
    const status = check.reason === "not-authenticated" ? 401 : 403;
    return NextResponse.json({ error: check.reason }, { status });
  }

  const userId = params.id;
  const body = (await req.json()) as Partial<{
    first_name: string | null;
    last_name: string | null;
    role: Role | null;
    status: Status | null;
    email: string | null; // optional (updates auth.users via Admin API)
  }>;

  const role = normalizeRole(body.role ?? null);
  const status = normalizeStatus(body.status ?? null);

  // 1) Update profiles fields if provided
  const updates: Record<string, string | null> = {};
  if ("first_name" in body) updates.first_name = body.first_name ?? null;
  if ("last_name" in body) updates.last_name = body.last_name ?? null;
  if ("role" in body) updates.role = role;
  if ("status" in body) updates.status = status;

  if (Object.keys(updates).length > 0) {
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }
  }

  // 2) Update email in auth.users if requested
  if ("email" in body) {
    const newEmail = (body.email ?? "").trim();
    if (newEmail.length > 0) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: newEmail,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
