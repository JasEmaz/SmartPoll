import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  compiler: {
    // Remove all console logs in production
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
