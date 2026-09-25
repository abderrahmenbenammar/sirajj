import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";

// Public sitemap only: courses, library items and core public pages.
// Private areas (/admin, /dashboard, /auth/*) and /api are deliberately
// excluded here and additionally disallowed in robots.ts.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [courses, items] = await Promise.all([
    prisma.course.findMany({ select: { id: true, updatedAt: true } }),
    prisma.libraryItem.findMany({ select: { id: true, updatedAt: true } }),
  ]);
  return [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/courses` },
    { url: `${base}/paths` },
    { url: `${base}/library` },
    { url: `${base}/about` },
    { url: `${base}/contact` },
    { url: `${base}/faq` },
    ...courses.map((course) => ({
      url: `${base}/courses/${course.id}`,
      lastModified: course.updatedAt,
    })),
    ...items.map((item) => ({
      url: `${base}/library/${item.id}`,
      lastModified: item.updatedAt,
    })),
  ];
}
