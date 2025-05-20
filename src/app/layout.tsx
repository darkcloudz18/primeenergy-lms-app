// src/app/layout.tsx
"use client";

import React, { useState } from "react";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "@/styles/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // replace createBrowserSupabaseClient() with createClientComponentClient()
  const [supabaseClient] = useState(() => createClientComponentClient());
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-gray-100">
        <SessionContextProvider supabaseClient={supabaseClient}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </SessionContextProvider>
      </body>
    </html>
  );
}
