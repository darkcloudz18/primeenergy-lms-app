export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSupabaseRSC } from "@/lib/supabase-rsc";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type NamePayload = {
  first_name: string | null;
  last_name: string | null;
  displayName: string;
  source: "profiles" | "metadata" | "email";
};

function titleCase(s: string) {
  return s
    .toLowerCase()
    .replace(
      /(^|\s|-|')(.)/g,
      (_m, p1: string, p2: string) => p1 + p2.toUpperCase()
    );
}

function prettyFromEmail(email?: string | null) {
  if (!email) return "Learner";
  const local = email.split("@")[0] ?? "";
  return (
    local
      .replace(/\./g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim() || "Learner"
  );
}

export async function GET() {
  const sb = getSupabaseRSC();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userId = user.id;
  const email = (user.email ?? "").toLowerCase();

  // 1) RLS: fetch by id (works only if profiles.id === auth.users.id)
  let first: string | null = null;
  let last: string | null = null;
  let source: NamePayload["source"] = "profiles";

  {
    const { data: p } = await sb
      .from("profiles")
      .select("first_name,last_name")
      .eq("id", userId)
      .maybeSingle();
    if (p) {
      first = (p.first_name as string | null) ?? null;
      last = (p.last_name as string | null) ?? null;
    }
  }

  // 2) Fallback: service-role by email (handles rows with wrong id)
  if (!first && !last) {
    const { data: pByEmail } = await supabaseAdmin
      .from("profiles")
      .select("first_name,last_name,id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();
    if (pByEmail) {
      first = (pByEmail.first_name as string | null) ?? null;
      last = (pByEmail.last_name as string | null) ?? null;
      source = "profiles";
    }
  }

  // 3) Auth metadata
  if (!first && !last) {
    const m = (user.user_metadata ?? {}) as Record<string, unknown>;
    first = typeof m.first_name === "string" ? (m.first_name as string) : null;
    last = typeof m.last_name === "string" ? (m.last_name as string) : null;
    if (first || last) source = "metadata";
  }

  // 4) Build display name
  let displayName: string;
  if (first || last) {
    displayName = `${titleCase(first ?? "")} ${titleCase(last ?? "")}`.trim();
  } else {
    displayName = prettyFromEmail(email);
    source = "email";
  }

  return NextResponse.json<NamePayload>({
    first_name: first,
    last_name: last,
    displayName,
    source,
  });
}
