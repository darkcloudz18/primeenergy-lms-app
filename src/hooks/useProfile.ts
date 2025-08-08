// src/hooks/useProfile.ts
"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";

export type ProfileClient = {
  id: string;
  role: "student" | "tutor" | "admin";
  first_name: string | null;
  last_name: string | null;
  status: string | null;
};

export function useProfile() {
  const supabase = useSupabaseClient();
  const session = useSession();

  // depend on a stable primitive, not the whole user object
  const userId = session?.user?.id ?? null;

  const [profile, setProfile] = useState<ProfileClient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!userId) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, first_name, last_name, status")
        .eq("id", userId)
        .single();

      if (!cancelled) {
        if (error) console.error("useProfile error", error);
        setProfile((data ?? null) as ProfileClient | null);
        setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]); // ✅ no eslint warning

  return { profile, loading };
}
