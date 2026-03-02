import type { NextConfig } from "next";
import { createVanillaExtractPlugin } from "@vanilla-extract/next-plugin";

const withVanillaExtract = createVanillaExtractPlugin();

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack(config) {
    config.externals = [...(config.externals ?? []), { canvas: "canvas" }];
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/resume/:slug.pdf",
        destination: "/api/resume-pdf/:slug",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
      },
    ],
  },
};

export default withVanillaExtract(nextConfig);
