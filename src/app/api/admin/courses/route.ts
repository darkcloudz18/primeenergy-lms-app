import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(): Promise<NextResponse> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("courses").select("*"); // pull all courses for the index route

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
