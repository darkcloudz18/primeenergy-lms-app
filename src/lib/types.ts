// src/lib/types.ts

export interface Course {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: "student" | "tutor" | "admin";
  created_at: string;
}
