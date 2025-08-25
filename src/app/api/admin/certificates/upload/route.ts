// src/app/api/admin/certificates/upload/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // service-role client

export const dynamic = "force-dynamic";

const BUCKET = "certificates";

export async function POST(req: Request) {
  try {
    // 1) Must be signed in (optionally also check is_admin from profiles)
    const userClient = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();
    if (authErr || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // OPTIONAL: enforce admin users only
    // const { data: prof } = await userClient
    //   .from("profiles")
    //   .select("is_admin")
    //   .eq("id", user.id)
    //   .maybeSingle();
    // if (!prof?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 2) Parse form-data
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    // 3) Ensure bucket exists (service role bypasses RLS)
    const { data: buckets, error: listErr } =
      await supabaseAdmin.storage.listBuckets();
    if (listErr)
      return NextResponse.json({ error: listErr.message }, { status: 500 });
    const hasBucket = (buckets ?? []).some((b) => b.name === BUCKET);
    if (!hasBucket) {
      const { error: createErr } = await supabaseAdmin.storage.createBucket(
        BUCKET,
        {
          public: true, // public read; writes still via this route
        }
      );
      if (createErr)
        return NextResponse.json({ error: createErr.message }, { status: 500 });
    }

    // 4) Upload with service role (no RLS issues)
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const key = `templates/${crypto.randomUUID()}.${ext}`;
    const data = new Uint8Array(await file.arrayBuffer());

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(key, data, {
        contentType: file.type || "image/png",
        upsert: false,
      });
    if (uploadErr)
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    // 5) Return public URL
    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(key);
    return NextResponse.json({ url: pub.publicUrl }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
