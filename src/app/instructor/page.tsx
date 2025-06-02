// src/app/instructor/page.tsx
import { redirect } from "next/navigation";

export default function InstructorIndex() {
  redirect("/instructor/dashboard");
}
