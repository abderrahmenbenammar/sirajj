// arabic-persian-reshaper ships CommonJS with no type declarations.
// Declared here so `import { ArabicShaper }` type-checks under strict mode.
declare module "arabic-persian-reshaper" {
  export const ArabicShaper: {
    /** Base Arabic characters → Arabic presentation forms (logical order). */
    convertArabic(text: string): string;
    /** Presentation forms → base characters (inverse of convertArabic). */
    convertArabicBack(text: string): string;
  };
}
