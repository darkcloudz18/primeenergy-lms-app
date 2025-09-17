import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import CongratsClient from "./CongratsClient";

export const dynamic = "force-dynamic";

type CourseProgress = { status: "in_progress" | "completed"; completed_at: string | null };

export default async function CongratulationsPage({ params }: { params: { courseId: string } }) {
  const { courseId } = params;

  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { data: progress } = await supabase
    .from("course_progress")
    .select("status, completed_at")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle() as unknown as { data: CourseProgress | null };

  if (!progress || progress.status !== "completed") redirect(`/courses/${courseId}`);

  const { data: course } = await supabase
    .from("courses")
    .select("title")
    .eq("id", courseId)
    .maybeSingle();
  const courseTitle = course?.title ?? "Course";

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, first_name, last_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const initialName =
    profile?.full_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.email?.split("@")[0] ||
    "Learner";

  const dateText = progress.completed_at
    ? new Date(progress.completed_at).toLocaleDateString()
    : new Date().toLocaleDateString();

  // (Optional) already-issued file
  const { data: issued } = await supabase
    .from("certificates_issued")
    .select("url")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: template } = await supabase
    .from("certificate_templates")
    .select("id,name,image_url,name_x,name_y,course_x,course_y,date_x,date_y,font_size,font_color,is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <CongratsClient
        template={template ?? null}
        initialName={initialName}
        courseTitle={courseTitle}
        dateText={dateText}
        courseId={courseId}
        certificateUrl={issued?.url ?? null}
      />
    </div>
  );
}