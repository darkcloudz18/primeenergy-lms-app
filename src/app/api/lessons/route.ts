import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { course_id, module_id, title, content, type, ordering, image_url } =
    req.body;
  if (
    !course_id ||
    !module_id ||
    !title ||
    !content ||
    !type ||
    ordering == null
  ) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const { data, error } = await supabaseAdmin
    .from("lessons")
    .insert({
      course_id,
      module_id,
      title,
      content,
      type,
      ordering,
      image_url: image_url || null,
    })
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}
