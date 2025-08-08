// src/app/api/create-profile/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { userId, firstName, lastName, email, role } = await request.json();

  // insert into profiles using your service_role key
  const { error } = await supabaseAdmin.from("profiles").insert({
    id: userId, // this is the PK on profiles
    first_name: firstName,
    last_name: lastName,
    email,
    role,
    status: "pending", // or whatever default you want
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Profile created" }, { status: 201 });
}
