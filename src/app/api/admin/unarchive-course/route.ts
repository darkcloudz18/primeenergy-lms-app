// src/app/api/admin/unarchive-course/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface UnarchiveBody {
  courseId: string;
}

export async function POST(req: Request) {
  try {
    // strongly‐type the JSON payload
    const { courseId } = (await req.json()) as UnarchiveBody;

    const { error } = await supabaseAdmin
      .from("courses")
      .update({ archived: false })
      .eq("id", courseId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
