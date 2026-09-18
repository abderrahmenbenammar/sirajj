import type { Prisma, PrismaClient } from "@prisma/client";

// Client-supplied libraryItemIds must never be trusted as-is: each entry must
// be a well-formed UUID, duplicates are collapsed, and every id must actually
// belong to an existing LibraryItem before any relation is written.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Db = PrismaClient | Prisma.TransactionClient;

// Returns a deduped, trimmed array of valid UUIDs in the client's order.
// Returns null when the payload is not a string array or contains a malformed
// id (the caller must reject the request). Absent/null is [] (no references).
export function normalizeLibraryItemIds(value: unknown): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") return null;
    const id = entry.trim();
    if (!id) continue;
    if (!UUID_RE.test(id)) return null;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

export async function libraryItemsExist(db: Db, ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const rows = await db.libraryItem.findMany({ where: { id: { in: ids } }, select: { id: true } });
  return rows.length === ids.length;
}