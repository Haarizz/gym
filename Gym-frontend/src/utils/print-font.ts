// Plus Jakarta Sans for printed documents. Print frames and report windows are separate
// documents that don't see the app's CSS, so the font is declared inside each one.
import latinUrl from "@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2?url";
import latinExtUrl from "@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-ext-wght-normal.woff2?url";
import dirhamUrl from "../assets/fonts/gymbios-dirham.otf?url";

/** Font stack for printed documents (Arabic falls through to Noto / the system font). */
export const PRINT_FONT = `'Plus Jakarta Sans Variable', 'Segoe UI', Arial, 'Noto Sans Arabic', sans-serif`;

const absolute = (url: string) => new URL(url, window.location.href).href;

/** @font-face rules for Plus Jakarta Sans (absolute URLs, so they work from about:blank). */
export function printFontCss(): string {
  const face = (url: string, range: string) =>
    `@font-face{font-family:'Plus Jakarta Sans Variable';font-style:normal;font-weight:200 800;font-display:block;` +
    `src:url(${absolute(url)}) format('woff2-variations');unicode-range:${range}}`;
  return (
    // UAE Dirham sign (U+20C3) — see styles/fonts.css.
    `@font-face{font-family:'Plus Jakarta Sans Variable';font-weight:100 900;font-display:block;` +
    `src:url(${absolute(dirhamUrl)}) format('opentype');unicode-range:U+20C3}` +
    face(latinExtUrl, "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF") +
    face(latinUrl, "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD")
  );
}

/** Adds the font declarations to a complete HTML document (or prepends them to a fragment). */
export function withPrintFont(html: string): string {
  const style = `<style>${printFontCss()}</style>`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + style) : style + html;
}

/** Resolves once the document's Plus Jakarta Sans weights are loaded (or after `timeoutMs`). */
export function printFontReady(doc: Document, timeoutMs = 2500): Promise<void> {
  const fonts = doc.fonts;
  if (!fonts?.load) return Promise.resolve();
  const loads = ["400", "500", "600", "700"].map((w) => fonts.load(`${w} 12px 'Plus Jakarta Sans Variable'`).catch(() => []));
  return Promise.race([
    Promise.all(loads).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

/** Prints a report window once its fonts are in (window.open + document.write documents). */
export function printWhenFontReady(win: Window) {
  printFontReady(win.document).then(() => {
    win.focus();
    win.print();
  });
}
