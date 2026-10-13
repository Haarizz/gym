import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return dropOrphanedAccentText(twMerge(clsx(inputs)));
}

const ACCENT_TEXT = "text-accent-foreground";

// BG_100: the outline/ghost button (and menu item) variants pair `hover:bg-accent` with
// `hover:text-accent-foreground` — white text on the brand red. When a caller overrides
// only the background with a light one (e.g. `hover:bg-white`, `hover:bg-gray-50`),
// twMerge drops bg-accent but keeps the white text, so the label vanishes on hover.
// Drop a state-prefixed accent text colour whose matching accent background was replaced.
function dropOrphanedAccentText(classes: string): string {
  if (!classes.includes(ACCENT_TEXT)) return classes;
  const tokens = classes.split(" ");
  return tokens
    .filter((token) => {
      if (!token.endsWith(ACCENT_TEXT)) return true;
      const prefix = token.slice(0, -ACCENT_TEXT.length); // "hover:", "focus:", ...
      if (!prefix) return true;
      const bgs = tokens.filter((t) => t.startsWith(prefix + "bg-"));
      return bgs.length === 0 || bgs.some((t) => t.startsWith(prefix + "bg-accent"));
    })
    .join(" ");
}
