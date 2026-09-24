"use client";

// Calm loading placeholders so admin pages stay stable while data loads
// (no flashing "unavailable" states).
export function CardSkeleton({ lines = 4 }: { lines?: number }) {
  const widths = ["85%", "70%", "92%", "60%", "78%"];
  return (
    <div
      aria-hidden="true"
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"
          style={{ width: widths[i % widths.length] }}
        />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
        />
      ))}
    </div>
  );
}
