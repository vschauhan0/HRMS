import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next-build",
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ['pdfkit'],
  allowedDevOrigins: ["192.168.1.222", "localhost"],
};

export default nextConfig;
// trigger restart
