import type { Metadata } from "next";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, secondsToISO8601Duration, siteUrl, truncateText } from "@/lib/seo";
import CourseDetailClient from "./CourseDetailClient";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Minimal SEO read: only the fields metadata/JSON-LD need (no lessons,
// no progress — the client UI fetches its own data as before).
const getCourseSEO = cache(async (id: string) => {
  if (!UUID_RE.test(id)) return null;
  return prisma.course.findUnique({
    where: { id },
    select: {
      titleAr: true,
      titleEn: true,
      shortDescriptionAr: true,
      shortDescriptionEn: true,
      coverImageUrl: true,
      instructorNameAr: true,
      instructorNameEn: true,
      durationSeconds: true,
    },
  });
});

function courseTitle(course: NonNullable<Awaited<ReturnType<typeof getCourseSEO>>>): string {
  return course.titleAr || course.titleEn;
}

function courseDescription(course: NonNullable<Awaited<ReturnType<typeof getCourseSEO>>>): string {
  return truncateText(
    course.shortDescriptionAr || course.shortDescriptionEn || `دورة ${courseTitle(course)} على منصة سراج`
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const course = await getCourseSEO(id);
  if (!course) return {};
  const title = courseTitle(course);
  const description = courseDescription(course);
  const url = `/courses/${id}`;
  const image = absoluteUrl(course.coverImageUrl) ?? `${siteUrl()}/siraj-logo.png`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | سراج`,
      description,
      url,
      type: "website",
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | سراج`,
      description,
      images: [image],
    },
  };
}

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourseSEO(id);
  const base = siteUrl();
  const title = course ? courseTitle(course) : null;
  const instructor = course?.instructorNameAr || course?.instructorNameEn || null;
  const image = course ? absoluteUrl(course.coverImageUrl) : undefined;
  const duration = course ? secondsToISO8601Duration(course.durationSeconds) : undefined;
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${base}/` },
          { "@type": "ListItem", position: 2, name: "الدورات", item: `${base}/courses` },
          ...(title ? [{ "@type": "ListItem", position: 3, name: title, item: `${base}/courses/${id}` }] : []),
        ],
      },
      ...(title && course
        ? [
            {
              "@type": "Course",
              name: title,
              description: courseDescription(course),
              url: `${base}/courses/${id}`,
              inLanguage: ["ar", "en"],
              provider: { "@type": "Organization", name: "سراج", url: base },
              ...(instructor ? { instructor: { "@type": "Person", name: instructor } } : {}),
              ...(image ? { image } : {}),
              ...(duration ? { duration } : {}),
            },
          ]
        : []),
    ],
  };
  return (
    <>
      {/* JSON.stringify output escapes "<" so a "</script>" sequence inside
          database text (e.g. a course title) can never break out of this tag. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <CourseDetailClient id={id} />
    </>
  );
}
