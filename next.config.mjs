/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    domains: ["funllevofdmacyepqgfc.supabase.co"],
    // If you prefer remotePatterns, you could write:
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
