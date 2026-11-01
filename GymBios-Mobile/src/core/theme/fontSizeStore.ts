import { create } from 'zustand';

import { secureStorage } from '@/core/platform/storage/secureStorage';

const FONT_SIZE_KEY = 'app.fontSize';

export const FONT_SIZES = [
  { key: 'small', scale: 0.9 },
  { key: 'default', scale: 1 },
  { key: 'large', scale: 1.15 },
  { key: 'xlarge', scale: 1.3 },
] as const;

export type FontSizeKey = (typeof FONT_SIZES)[number]['key'];

/**
 * Upper bound for the in-app size combined with the device's own text size, so a
 * large device setting on top of "Extra large" can't blow layouts apart.
 */
export const MAX_COMBINED_FONT_SCALE = 2;

function isFontSizeKey(value: unknown): value is FontSizeKey {
  return FONT_SIZES.some((size) => size.key === value);
}

export function getFontScale(key: FontSizeKey): number {
  return FONT_SIZES.find((size) => size.key === key)?.scale ?? 1;
}

interface FontSizeStoreState {
  fontSize: FontSizeKey;
  scale: number;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  /** Applies straight away (no reload) and persists on this device. */
  setFontSize: (key: FontSizeKey) => Promise<void>;
}

export const useFontSizeStore = create<FontSizeStoreState>((set) => ({
  fontSize: 'default',
  scale: 1,
  isHydrated: false,

  hydrate: async () => {
    const stored = await secureStorage.getItem(FONT_SIZE_KEY).catch(() => null);
    const fontSize = isFontSizeKey(stored) ? stored : 'default';
    set({ fontSize, scale: getFontScale(fontSize), isHydrated: true });
  },

  setFontSize: async (key) => {
    set({ fontSize: key, scale: getFontScale(key) });
    await secureStorage.setItem(FONT_SIZE_KEY, key).catch(() => {});
  },
}));

/** Current in-app text scale (1 = default). */
export const useFontScale = () => useFontSizeStore((s) => s.scale);
