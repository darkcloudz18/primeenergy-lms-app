// src/app/admin/page.tsx
import { redirect } from "next/navigation";

export default function AdminIndex() {
  // whenever someone hits /admin, send them to /admin/dashboard
  redirect("/admin/dashboard");
}
