// src/pages/_app.tsx
import "@/styles/globals.css";
import type { AppProps } from "next/app"; // ← import the built-in AppProps type
import { useState } from "react";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function MyApp({ Component, pageProps }: AppProps) {
  // Create a Supabase client just once
  const [supabase] = useState(() => createBrowserSupabaseClient());

  return (
    <SessionContextProvider supabaseClient={supabase}>
      <Header />
      <Component {...pageProps} />
      <Footer />
    </SessionContextProvider>
  );
}
