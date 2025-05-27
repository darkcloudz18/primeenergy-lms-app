// src/app/api/admin/courses/[id]/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function DELETE(
  request: Request, // ← use the Web Request type
  { params }: { params: { id: string } } // ← keep the shape, but don’t import/annotate with NextRequest
) {
  const { id } = params;
  const supabase = createServerClient();

  const { error } = await supabase.from("courses").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
