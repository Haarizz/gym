// The responsive layer (src/styles/responsive.css, the mobile table cards and the
// mobile-friendly app shell) applies to every screen except the Point of Sale, which
// keeps its own layout untouched. While a POS route is showing, <html data-gb-pos>
// is set and every responsive rule — all scoped under html:not([data-gb-pos]) —
// switches off, so the POS renders exactly as it did before that layer existed.
// Dialogs and popovers are portaled to <body>, which is why the flag lives on <html>
// rather than on a wrapper around the page.

const ORIGINAL_VIEWPORT = "width=device-width, initial-scale=1.0";

// viewport-fit=cover exposes env(safe-area-inset-*) so the shell can pad around the
// notch / home indicator. On iOS, maximum-scale also stops Safari from zooming into
// a focused field (and never zooming back out) — iOS still allows pinch-zoom despite
// it, whereas Android would honour it and block pinch-zoom, so it's iOS-only.
const isIOS =
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
const RESPONSIVE_VIEWPORT = isIOS
  ? `${ORIGINAL_VIEWPORT}, maximum-scale=1.0, viewport-fit=cover`
  : `${ORIGINAL_VIEWPORT}, viewport-fit=cover`;

export function isPosPath(pathname: string): boolean {
  return pathname === "/point-of-sale" || pathname.startsWith("/point-of-sale/");
}

export function applyResponsiveScope(pathname: string): void {
  if (typeof document === "undefined") return;
  const pos = isPosPath(pathname);
  document.documentElement.toggleAttribute("data-gb-pos", pos);
  const viewport = document.querySelector('meta[name="viewport"]');
  const content = pos ? ORIGINAL_VIEWPORT : RESPONSIVE_VIEWPORT;
  if (viewport && viewport.getAttribute("content") !== content) {
    viewport.setAttribute("content", content);
  }
}
