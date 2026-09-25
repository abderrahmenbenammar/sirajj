import type { Metadata } from "next";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, siteUrl, truncateText } from "@/lib/seo";
import LibraryDetailClient from "./LibraryDetailClient";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Schema.org type per library content kind (only kinds we actually store).
const SCHEMA_TYPE: Record<string, string> = {
  book: "Book",
  article: "Article",
  research: "ScholarlyArticle",
  lecture: "CreativeWork",
};

// Minimal SEO read: only the fields metadata/JSON-LD need (the client UI
// fetches its own data as before).
const getItemSEO = cache(async (id: string) => {
  if (!UUID_RE.test(id)) return null;
  return prisma.libraryItem.findUnique({
    where: { id },
    select: {
      type: true,
      titleAr: true,
      titleEn: true,
      authorName: true,
      descriptionAr: true,
      descriptionEn: true,
      coverImageUrl: true,
      publishedAt: true,
      createdAt: true,
    },
  });
});

type SeoItem = NonNullable<Awaited<ReturnType<typeof getItemSEO>>>;

function itemTitle(item: SeoItem): string {
  return item.titleAr || item.titleEn;
}

function itemDescription(item: SeoItem): string {
  return truncateText(
    item.descriptionAr || item.descriptionEn || `${itemTitle(item)} في مكتبة سراج`
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = await getItemSEO(id);
  if (!item) return {};
  const title = itemTitle(item);
  const description = itemDescription(item);
  const url = `/library/${id}`;
  const image = absoluteUrl(item.coverImageUrl) ?? `${siteUrl()}/siraj-logo.png`;
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

export default async function LibraryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getItemSEO(id);
  const base = siteUrl();
  const title = item ? itemTitle(item) : null;
  const image = item ? absoluteUrl(item.coverImageUrl) : undefined;
  const published = item ? (item.publishedAt ?? item.createdAt) : null;
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${base}/` },
          { "@type": "ListItem", position: 2, name: "المكتبة", item: `${base}/library` },
          ...(title ? [{ "@type": "ListItem", position: 3, name: title, item: `${base}/library/${id}` }] : []),
        ],
      },
      ...(title && item
        ? [
            {
              "@type": SCHEMA_TYPE[item.type] ?? "CreativeWork",
              name: title,
              ...(item.descriptionAr || item.descriptionEn ? { description: itemDescription(item) } : {}),
              url: `${base}/library/${id}`,
              inLanguage: ["ar", "en"],
              publisher: { "@type": "Organization", name: "سراج", url: base },
              ...(item.authorName ? { author: { "@type": "Person", name: item.authorName } } : {}),
              ...(image ? { image } : {}),
              ...(published ? { datePublished: published.toISOString() } : {}),
            },
          ]
        : []),
    ],
  };
  return (
    <>
      {/* JSON.stringify output escapes "<" so a "</script>" sequence inside
          database text (e.g. an item title) can never break out of this tag. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <LibraryDetailClient id={id} />
    </>
  );
}
