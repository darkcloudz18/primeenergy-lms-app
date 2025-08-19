import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("certificate_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { name, image_url, ...pos } = body as {
    name: string;
    image_url: string;
    name_x?: number;
    name_y?: number;
    course_x?: number;
    course_y?: number;
    date_x?: number;
    date_y?: number;
    font_size?: number;
    font_color?: string;
  };

  if (!name || !image_url) {
    return NextResponse.json(
      { error: "name and image_url required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("certificate_templates")
    .insert({ name, image_url, ...pos })
    .select("id")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
