import type * as React from "react";

// The app renders <body> at `zoom: 0.9` (see src/styles/index.css). Radix/floating-ui
// read the trigger's position via getBoundingClientRect (real viewport px) and write it
// back as `transform: translate(x, y)` on a portaled wrapper — but a wrapper portaled
// into the zoomed <body> has that translate scaled by 0.9 again, so the popup lands at
// 90% of the correct coordinates and drifts further from its trigger the lower/further
// right the trigger sits (e.g. a table row's action menu opening over another row).
//
// Portaling into this host instead fixes that: it lives inside <body> (so fonts/colors
// still inherit) but counter-zooms by 1/bodyZoom, making its effective zoom exactly 1,
// so floating-ui's coordinates map 1:1 to the screen. The popup content itself then
// re-applies `bodyZoom` (overlayContentStyle) so it renders at the same visual size as
// the rest of the UI.

let overlayRoot: HTMLElement | null = null;

export function getBodyZoom(): number {
  if (typeof document === "undefined") return 1;
  const zoom = parseFloat(getComputedStyle(document.body).zoom);
  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}

export function getOverlayRoot(): HTMLElement | undefined {
  if (typeof document === "undefined") return undefined;
  const zoom = getBodyZoom();
  if (overlayRoot?.isConnected) {
    // The body zoom is 1 on phones outside the POS (src/styles/responsive.css) and
    // 0.9 elsewhere, so it can change on rotation/resize or when entering the POS —
    // keep the counter-zoom in step with it.
    if (overlayRoot.style.getPropertyValue("--overlay-zoom") !== String(zoom)) {
      overlayRoot.style.zoom = String(1 / zoom);
      overlayRoot.style.setProperty("--overlay-zoom", String(zoom));
    }
    return overlayRoot;
  }
  overlayRoot = document.createElement("div");
  overlayRoot.setAttribute("data-slot", "overlay-root");
  overlayRoot.style.zoom = String(1 / zoom);
  // Created once, on first use — so dialogs/sheets opened later are portaled AFTER
  // this host and would win a z-50 vs z-50 tie by DOM order, hiding e.g. a Select
  // opened inside a Dialog. Lift the whole host above every modal layer in the app
  // (highest in use is 60) instead. Neither property creates a containing block, so
  // the popups' position: fixed still resolves against the viewport.
  overlayRoot.style.position = "relative";
  overlayRoot.style.zIndex = "100";
  overlayRoot.style.setProperty("--overlay-zoom", String(zoom));
  document.body.appendChild(overlayRoot);
  return overlayRoot;
}

// Style every anchored popup's content element gets: re-applies the body zoom that
// the overlay root cancelled out, so it renders at the app's normal visual scale.
export function overlayContentStyle(style?: React.CSSProperties): React.CSSProperties {
  return { zoom: getBodyZoom(), ...style };
}

// Radix's size variables (--radix-*-trigger-width etc.) hold real viewport px, but are
// consumed inside popup content rendered at `zoom: bodyZoom` — used as-is they'd come
// out ~10% too small. Wrap one in this to size a popup to match its trigger exactly.
export function overlaySize(cssVar: string): string {
  return `calc(var(${cssVar}) / var(--overlay-zoom, 1))`;
}
