// src/app/api/modules/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  // 1️⃣ Parse JSON from the Request
  let body: { course_id?: string; title?: string; ordering?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { course_id, title, ordering } = body;
  if (!course_id || !title || ordering == null) {
    return NextResponse.json(
      { error: "Missing fields: course_id, title, and ordering are required" },
      { status: 400 }
    );
  }

  // 2️⃣ Insert into Supabase
  const { data, error } = await supabaseAdmin
    .from("modules")
    .insert({ course_id, title, ordering })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Insert failed" },
      { status: 500 }
    );
  }

  // 3️⃣ Return the newly created module
  return NextResponse.json(data, { status: 201 });
}
