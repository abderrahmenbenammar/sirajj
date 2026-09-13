// Client-side types + fetchers for the real library (PostgreSQL library_items).

export type LibraryType = "book" | "article" | "research" | "lecture";

export interface ApiLibraryItem {
  id: string;
  type: string;
  titleAr: string;
  titleEn: string;
  authorName: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  contentUrl: string;
  categoryId: string | null;
  categoryAr: string | null;
  categoryEn: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface ApiCategory {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
}

export async function fetchLibrary(params: {
  type?: string;
  q?: string;
  categoryId?: string;
  take?: number;
}): Promise<{ items: ApiLibraryItem[]; total: number }> {
  const search = new URLSearchParams();
  if (params.type) search.set("type", params.type);
  if (params.q) search.set("q", params.q);
  if (params.categoryId) search.set("categoryId", params.categoryId);
  if (params.take !== undefined) search.set("take", String(params.take));
  const response = await fetch(`/api/library?${search.toString()}`);
  if (!response.ok) throw new Error(`library-${response.status}`);
  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null) return { items: [], total: 0 };
  const { items, total } = data as { items: unknown; total: unknown };
  return {
    items: Array.isArray(items) ? (items as ApiLibraryItem[]) : [],
    total: typeof total === "number" ? total : 0,
  };
}

export async function fetchLibraryItem(id: string): Promise<ApiLibraryItem | null> {
  const response = await fetch(`/api/library/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`library-item-${response.status}`);
  return (await response.json()) as ApiLibraryItem;
}

export async function fetchCategories(): Promise<ApiCategory[]> {
  const response = await fetch("/api/categories");
  if (!response.ok) return [];
  const data: unknown = await response.json();
  return Array.isArray(data) ? (data as ApiCategory[]) : [];
}
