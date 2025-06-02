import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { course_id, title, ordering } = req.body;
  if (!course_id || !title || ordering == null) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const { data, error } = await supabaseAdmin
    .from("modules")
    .insert({ course_id, title, ordering })
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}
