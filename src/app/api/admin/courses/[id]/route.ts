// src/app/api/admin/courses/[id]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await supabaseAdmin!.from("courses").delete().eq("id", params.id);
  return NextResponse.json({ ok: true });
}
