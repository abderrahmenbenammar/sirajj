import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

// Public content (courses, library, core pages) is indexable; private
// areas, auth flows and JSON APIs are not.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/dashboard/", "/auth/", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
