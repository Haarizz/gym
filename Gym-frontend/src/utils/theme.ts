import { useSyncExternalStore } from "react";

/**
 * Personal colour theme (Settings > Theme). The palettes live in styles/index.css as
 * --gb-* variables under :root[data-gb-theme="…"]; this module only flips that
 * attribute and remembers the choice per user on this device. Signed-out screens
 * (login, public forms) always use LOGIN_THEME. index.html applies the right theme
 * before the first paint so there is no flash on reload — keep its id list in sync.
 * Printed documents (receipts, statements, salary slips) deliberately keep their own
 * fixed colours — they must look the same whoever prints them.
 */
export type ThemeId = "blue" | "teal" | "indigo" | "green" | "orange" | "plum" | "graphite";

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  /** Fixed hexes for the preview tiles, so every option previews itself regardless of the active theme. */
  swatches: {
    sidebar: string;
    sidebarActive: string;
    primary: string;
    hover: string;
    light: string;
    background: string;
    border: string;
    text: string;
    muted: string;
  };
}

export const THEMES: ThemeOption[] = [
  {
    id: "blue",
    name: "Ocean Blue",
    description: "Clean, professional ERP blue with a dark blue sidebar.",
    swatches: {
      sidebar: "#1352CF",
      sidebarActive: "#1F71F1",
      primary: "#2693FD",
      hover: "#2382F6",
      light: "#C5DFFD",
      background: "#F5F9FF",
      border: "#DCE7F5",
      text: "#172B4D",
      muted: "#64748B",
    },
  },
  {
    id: "teal",
    name: "Classic Teal",
    description: "The original GymBios teal green.",
    swatches: {
      sidebar: "#2B7A78",
      sidebarActive: "#559593", // white 20% over the teal sidebar, as rendered
      primary: "#2B7A78",
      hover: "#236360",
      light: "#DFF5F4",
      background: "#F9FAFB",
      border: "#D1D5DB",
      text: "#1E293B",
      muted: "#4B5563",
    },
  },
  {
    id: "indigo",
    name: "Royal Indigo",
    description: "Modern SaaS indigo — crisp and focused.",
    swatches: {
      sidebar: "#312E81",
      sidebarActive: "#4F46E5",
      primary: "#4F46E5",
      hover: "#4338CA",
      light: "#E0E7FF",
      background: "#F3F5FB",
      border: "#D3D8EF",
      text: "#1E1B4B",
      muted: "#64748B",
    },
  },
  {
    id: "green",
    name: "Forest Green",
    description: "Calm finance green, easy on the eyes all day.",
    swatches: {
      sidebar: "#14532D",
      sidebarActive: "#15803D",
      primary: "#15803D",
      hover: "#166534",
      light: "#DCFCE7",
      background: "#F1F6F6",
      border: "#CEDEDE",
      text: "#1E293B",
      muted: "#64748B",
    },
  },
  {
    id: "orange",
    name: "Sunset Orange",
    description: "Warm, energetic orange with a deep rust sidebar.",
    swatches: {
      sidebar: "#7C2D12",
      sidebarActive: "#C2410C",
      primary: "#C2410C",
      hover: "#9A3412",
      light: "#FFEDD5",
      background: "#F6F4F5",
      border: "#DFD7D9",
      text: "#292524",
      muted: "#78716C",
    },
  },
  {
    id: "plum",
    name: "Aubergine",
    description: "Elegant muted plum, a classic business-suite look.",
    swatches: {
      sidebar: "#4A2F43",
      sidebarActive: "#714B67",
      primary: "#714B67",
      hover: "#5E3D55",
      light: "#F1E4EE",
      background: "#F4F5F8",
      border: "#D7D8E2",
      text: "#2A1F27",
      muted: "#6B5E68",
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Neutral slate monochrome — minimal and distraction-free.",
    swatches: {
      sidebar: "#0F172A",
      sidebarActive: "#334155",
      primary: "#334155",
      hover: "#1E293B",
      light: "#E2E8F0",
      background: "#F2F4F7",
      border: "#D1D7E1",
      text: "#0F172A",
      muted: "#64748B",
    },
  },
];

/** Signed-in users who haven't picked a theme yet. */
export const DEFAULT_THEME: ThemeId = "blue";
/** Login and other signed-out screens — the GymBios brand teal. */
export const LOGIN_THEME: ThemeId = "teal";

// index.html reads this key (with the signed-in user's id) before the bundle loads.
const userKey = (userId: string) => `gymbios_theme:${userId}`;
const CHANGED_EVENT = "gymbios:theme-changed";

let currentUserId: string | null = null;

const isThemeId = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);

function readStorage(key: string): ThemeId | null {
  try {
    const v = localStorage.getItem(key);
    return isThemeId(v) ? v : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: ThemeId) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode / blocked storage: the theme still applies for this session.
  }
}

export function getTheme(): ThemeId {
  const v = document.documentElement.dataset.gbTheme;
  return isThemeId(v) ? v : DEFAULT_THEME;
}

function applyTheme(id: ThemeId) {
  const root = document.documentElement;
  if (root.dataset.gbTheme === id) return;
  root.dataset.gbTheme = id;
  const option = THEMES.find((t) => t.id === id)!;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", option.swatches.primary);
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

/** Apply and remember a theme for the signed-in user. */
export function setTheme(id: ThemeId) {
  applyTheme(id);
  if (currentUserId) writeStorage(userKey(currentUserId), id);
}

/**
 * Called once auth has settled and whenever the signed-in user changes: that user's
 * saved theme (or the default), or the brand teal when nobody is signed in.
 */
export function syncThemeForUser(userId: string | null) {
  currentUserId = userId;
  applyTheme(userId ? readStorage(userKey(userId)) ?? DEFAULT_THEME : LOGIN_THEME);
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED_EVENT, onChange);
  return () => window.removeEventListener(CHANGED_EVENT, onChange);
}

export function useTheme(): ThemeId {
  return useSyncExternalStore(subscribe, getTheme, () => DEFAULT_THEME);
}
