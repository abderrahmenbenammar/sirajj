/**
 * Normalizes Arabic text so that memorization answers can be compared
 * (and sent to the AI grader) without noise from orthographic variants:
 * - removes tashkeel (diacritics) and tatweel
 * - standardizes hamzas (أ، إ، آ -> ا)
 * - converts ة -> ه and ى -> ي
 * - removes punctuation, keeping only Arabic letters, digits and spaces
 * - collapses whitespace
 */
export function normalizeArabicText(text: string): string {
  if (typeof text !== "string" || text.length === 0) return "";

  return (
    text
      // Tashkeel: fatha..sukun (U+064B–U+065F) + superscript alef (U+0670)
      .replace(/[ً-ٰٟ]/g, "")
      // Tatweel (kashida)
      .replace(/ـ/g, "")
      // Hamza variants -> bare alef
      .replace(/[أإآ]/g, "ا")
      // Taa marbuta -> haa, alef maqsura -> yaa
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      // Drop everything that is not an Arabic letter, a digit or whitespace
      // (this removes Arabic/Latin punctuation: ؟ ، ؛ . , ! ؟ " ' ( ) - …)
      .replace(/[^\u0621-\u064A\u0660-\u0669\u06F0-\u06F90-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}
