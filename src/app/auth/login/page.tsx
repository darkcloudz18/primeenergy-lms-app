import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server"; // your server-side helper
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LoginPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const role = (user.user_metadata?.role as string) ?? "student";
    if (role === "admin") redirect("/admin"); // <- fix the old '/admin/shre' typo
    if (role === "tutor") redirect("/dashboard/tutor");
    redirect("/dashboard");
  }

  return <LoginClient />;
}
