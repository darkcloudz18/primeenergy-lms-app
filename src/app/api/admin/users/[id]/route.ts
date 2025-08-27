// Disable caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PatchBody = {
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  status?: string | null;
  email?: string | null;
  password?: string | undefined;
};

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const body = (await req.json()) as PatchBody;

  // Update profile row
  const { error: upErr } = await supabaseAdmin
    .from("profiles")
    .update({
      first_name: body.first_name ?? null,
      last_name: body.last_name ?? null,
      role: body.role ?? null,
      status: body.status ?? null,
      email: body.email ?? null,
    })
    .eq("id", id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  // Keep auth user in sync (needs service role)
  if (body.email || body.password) {
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      {
        email: body.email || undefined,
        password: body.password || undefined,
      }
    );
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  // Delete auth user first
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 400 });
  }

  // Then remove profile row (if not CASCADE)
  const { error: profErr } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", id);

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 400 });
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
