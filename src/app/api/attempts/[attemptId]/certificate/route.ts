// src/app/api/attempts/[attemptId]/certificate/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params;
  const supabase = createServerClient();

  // Look up the certificate for this attempt
  const { data: cert, error } = await supabase
    .from("certificates_issued")
    .select("certificate_url")
    .eq("attempt_id", attemptId)
    .single();

  if (error || !cert) {
    return NextResponse.json(
      { error: "Certificate not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ url: cert.certificate_url });
}
