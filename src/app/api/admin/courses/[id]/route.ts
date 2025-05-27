import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ← Promise<{ id: string }>
): Promise<NextResponse> {
  const { id } = await params; // ← await the params
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ← same here
): Promise<NextResponse> {
  const { id } = await params;
  const updates = await request.json();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("courses")
    .update(updates)
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
