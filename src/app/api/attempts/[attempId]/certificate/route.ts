// app/api/attempts/[attemptId]/certificate/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(
  req: Request,
  { params }: { params: { attemptId: string } }
) {
  const { attemptId } = params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("certificates_issued")
    .select("certificate_url")
    .eq("attempt_id", attemptId)
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ url: data.certificate_url });
}
