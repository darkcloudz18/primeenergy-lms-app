// src/app/admin/page.tsx
import AdminDashboardPage from "@/app/admin/dashboard/page";

export default function AdminIndex() {
  // if you prefer `/admin` → `/admin/dashboard`, redirect:
  // import { redirect } from "next/navigation"
  // redirect("/admin/dashboard")
  return <AdminDashboardPage />;
}
