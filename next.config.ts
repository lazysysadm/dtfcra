import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  output: "standalone",
  // Dev cross-origin access (E2E container reaches the app by its podman hostname).
  allowedDevOrigins: ["dtfcra-app", "localhost", "127.0.0.1"],
};

export default nextConfig;
