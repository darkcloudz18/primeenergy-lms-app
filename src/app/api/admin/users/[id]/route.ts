// src/app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { role } = await req.json();
  const { data, error } = await supabaseAdmin!
    .from("profiles")
    .update({ role })
    .eq("id", params.id)
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ user: data });
}
