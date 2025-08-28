import { NextResponse } from "next/server";
import { getSupabaseRSC } from "@/lib/supabase-rsc";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseRSC();
  const body = await req.json();

  // If activating, first set all others to false
  if (body?.is_active === true) {
    const { error: clearErr } = await supabase
      .from("certificate_templates")
      .update({ is_active: false })
      .neq("id", params.id);
    if (clearErr)
      return NextResponse.json({ error: clearErr.message }, { status: 500 });
  }

  const { error } = await supabase
    .from("certificate_templates")
    .update(body)
    .eq("id", params.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseRSC();
  const { error } = await supabase
    .from("certificate_templates")
    .delete()
    .eq("id", params.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
