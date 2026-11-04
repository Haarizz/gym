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
export type ThemeId = "blue" | "teal" | "indigo" | "green" | "orange" | "plum" | "graphite" | "petrol" | "burgundy" | "mocha";

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
    // Id kept as "blue" so everyone who picked the old bright Ocean Blue moves to this one.
    id: "blue",
    name: "Navy Blue",
    description: "Calm, deep corporate blue — easy on the eyes all day.",
    swatches: {
      sidebar: "#0F2A4A",
      sidebarActive: "#24599A",
      primary: "#1D4E89",
      hover: "#173F70",
      light: "#D6E3F3",
      background: "#F1F4F8",
      border: "#D3DCE7",
      text: "#1A2B42",
      muted: "#5B6B80",
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
  {
    id: "petrol",
    name: "Petrol",
    description: "Deep cyan-blue — cool and calm for data-heavy work.",
    swatches: {
      sidebar: "#0B3442",
      sidebarActive: "#1A6E88",
      primary: "#155E75",
      hover: "#114D60",
      light: "#D3EAF0",
      background: "#F1F5F6",
      border: "#D0DDE1",
      text: "#14272E",
      muted: "#566B72",
    },
  },
  {
    id: "burgundy",
    name: "Burgundy",
    description: "Rich wine red — a classic finance-suite look.",
    swatches: {
      sidebar: "#5C1020",
      sidebarActive: "#A3253D",
      primary: "#9F1D35",
      hover: "#86182D",
      light: "#F6DCE2",
      background: "#F7F4F5",
      border: "#E2D5D8",
      text: "#2B1B1F",
      muted: "#6E5A5F",
    },
  },
  {
    id: "mocha",
    name: "Mocha",
    description: "Warm earthy brown — soft, low-glare and relaxed.",
    swatches: {
      sidebar: "#3F2817",
      sidebarActive: "#8A5A35",
      primary: "#7A4E2D",
      hover: "#664126",
      light: "#EFE2D6",
      background: "#F6F4F1",
      border: "#DDD4CC",
      text: "#2A2119",
      muted: "#6F6359",
    },
  },
];

/** Signed-in users who haven't picked a theme yet. */
export const DEFAULT_THEME: ThemeId = "blue";
/** The platform super admin (GYMBIOS_ADMIN) until they pick one. */
export const SUPER_ADMIN_THEME: ThemeId = "graphite";

// Same role check as App.tsx's isGymbiosAdmin, read from the session the login wrote.
function isSuperAdminSession(): boolean {
  try {
    const norm = (r: unknown) => String(r ?? "").toLowerCase().replace(/^role_/, "");
    const roles: unknown[] = JSON.parse(sessionStorage.getItem("roles") || "[]");
    return roles.some((r) => norm(r) === "gymbios_admin") || norm(sessionStorage.getItem("gymbios_role_name")) === "gymbios_admin";
  } catch {
    return false;
  }
}

/** A signed-in user's theme before they choose one: Graphite for the super admin, else the default. */
export function defaultThemeForSession(): ThemeId {
  return isSuperAdminSession() ? SUPER_ADMIN_THEME : DEFAULT_THEME;
}
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
  applyTheme(userId ? readStorage(userKey(userId)) ?? defaultThemeForSession() : LOGIN_THEME);
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED_EVENT, onChange);
  return () => window.removeEventListener(CHANGED_EVENT, onChange);
}

export function useTheme(): ThemeId {
  return useSyncExternalStore(subscribe, getTheme, () => DEFAULT_THEME);
}
