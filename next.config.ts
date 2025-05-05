// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    domains: ["funllevofdmacyepqgfc.supabase.co"],
    // Alternatively, you can be more specific with remotePatterns:
    // remotePatterns: [
    //   {
    //     protocol: "https",
    //     hostname: "funllevofdmacyepqgfc.supabase.co",
    //     port: "",
    //     pathname: "/storage/v1/object/public/uploads/**",
    //   },
    // ],
  },
};

export default nextConfig;
