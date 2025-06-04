// src/components/Providers.tsx
"use client";

import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function Providers({ children }: { children: React.ReactNode }) {
  // This runs in the browser, so `createClientComponentClient()` will produce
  // a fully functional Supabase client (complete with `.auth.signInWithPassword()`).
  const supabaseClient = createClientComponentClient();

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  );
}
