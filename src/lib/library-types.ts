// Bilingual labels for LibraryItem.type, shared by the admin references
// picker and the public course references section.

export const LIBRARY_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  book: { ar: "كتاب", en: "Book" },
  article: { ar: "مقال", en: "Article" },
  research: { ar: "بحث", en: "Research" },
  lecture: { ar: "محاضرة", en: "Lecture" },
};

export function libraryTypeLabel(type: string): { ar: string; en: string } {
  return LIBRARY_TYPE_LABELS[type] ?? LIBRARY_TYPE_LABELS.book;
}