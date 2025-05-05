// src/app/dashboard/page.tsx
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return redirect("/auth/login");

  return (
    <div>
      <h1>Instructor Dashboard</h1>
      <p>Welcome back, {session.user?.email}!</p>
      {/* … */}
    </div>
  );
}
