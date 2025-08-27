import { NextResponse } from "next/server";
import { getSupabaseRSC } from "@/lib/supabase-rsc";

export async function GET(
  _req: Request,
  { params }: { params: { courseId: string } }
) {
  const supabase = getSupabaseRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ certificate: null });

  const { data: cert, error } = await supabase
    .from("certificates")
    .select("id, issued_at, template_id")
    .eq("user_id", user.id)
    .eq("course_id", params.courseId)
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ certificate: cert ?? null });
}
