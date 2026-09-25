import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. Icons are rendered from the real Siraj
// logo (public/icons/*); no placeholder artwork.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "منصة سراج",
    short_name: "سراج",
    description: "أكاديمية تعليمية إسلامية حديثة: دورات، كتب، أبحاث، ومحاضرات.",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F9F7",
    theme_color: "#074142",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
