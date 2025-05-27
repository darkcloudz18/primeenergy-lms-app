// app/api/admin/courses/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  const supabase = createServerClient();

  const { error } = await supabase.from("courses").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
