import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native rasterizer for certificate images: must stay external so the
  // bundler does not try to inline its platform binary.
  // satori stays external too: its harfbuzzjs dependency resolves its
  // shaping wasm relative to the real node_modules tree at runtime
  // (bundling breaks that lookup and kills Arabic shaping).
  serverExternalPackages: ["@resvg/resvg-js", "satori"],
};

export default nextConfig;
