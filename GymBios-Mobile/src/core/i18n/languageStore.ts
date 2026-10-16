import { I18nManager, Platform } from 'react-native';
import { reloadAppAsync } from 'expo';
import { create } from 'zustand';

import { secureStorage } from '@/core/platform/storage/secureStorage';
import { queryClient } from '@/core/providers/QueryProvider';

import i18n from './i18n';
import { getDeviceLanguage, getLanguage, isLanguageCode, type LanguageCode } from './languages';

const LANGUAGE_KEY = 'app.language';
/** Route to land on after the reload that a layout-direction change needs. */
const RESUME_HREF_KEY = 'app.languageResumeHref';

interface ChooseLanguageResult {
  reloading: boolean;
  restartRequired: boolean;
}

interface LanguageStoreState {
  language: LanguageCode;
  /** False until the user has confirmed a language on this device. */
  hasChosen: boolean;
  isHydrated: boolean;
  resumeHref: string | null;
  hydrate: () => Promise<void>;
  /**
   * Applies and persists the language. When the layout direction flips the app
   * reloads (`reloading`), then opens `resumeHref`; if the reload isn't possible,
   * `restartRequired` asks the caller to tell the user to reopen the app.
   */
  chooseLanguage: (code: LanguageCode, resumeHref?: string) => Promise<ChooseLanguageResult>;
  /** Returns the pending post-reload route once, clearing it. */
  consumeResumeHref: () => string | null;
}

/**
 * Sets the native layout direction for the language. I18nManager only applies it
 * to a newly created React context, so returns true when a reload is still needed.
 */
function applyLayoutDirection(code: LanguageCode): boolean {
  if (Platform.OS === 'web') return false;
  const rtl = getLanguage(code).rtl;
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  return I18nManager.isRTL !== rtl;
}

export const useLanguageStore = create<LanguageStoreState>((set, get) => ({
  language: getDeviceLanguage(),
  hasChosen: false,
  isHydrated: false,
  resumeHref: null,

  hydrate: async () => {
    const [stored, resumeHref] = await Promise.all([
      secureStorage.getItem(LANGUAGE_KEY).catch(() => null),
      secureStorage.getItem(RESUME_HREF_KEY).catch(() => null),
    ]);
    const language = isLanguageCode(stored) ? stored : getDeviceLanguage();
    if (resumeHref) await secureStorage.removeItem(RESUME_HREF_KEY).catch(() => {});
    await i18n.changeLanguage(language);
    // Takes effect from the next launch at the latest; the language screen
    // reloads straight away when the user confirms a different direction.
    applyLayoutDirection(language);
    set({ language, hasChosen: stored != null && isLanguageCode(stored), resumeHref, isHydrated: true });
  },

  chooseLanguage: async (code, resumeHref) => {
    await i18n.changeLanguage(code);
    await secureStorage.setItem(LANGUAGE_KEY, code);
    set({ language: code, hasChosen: true });
    // Repositories build some display text (labels, "Full", "3 days") while mapping
    // API data; refetch so cached results pick up the new language.
    queryClient.invalidateQueries();

    if (!applyLayoutDirection(code)) return { reloading: false, restartRequired: false };
    if (resumeHref) await secureStorage.setItem(RESUME_HREF_KEY, resumeHref);
    try {
      await reloadAppAsync(`Layout direction changed for language "${code}"`);
      return { reloading: true, restartRequired: false };
    } catch {
      if (resumeHref) await secureStorage.removeItem(RESUME_HREF_KEY).catch(() => {});
      return { reloading: false, restartRequired: true };
    }
  },

  consumeResumeHref: () => {
    const { resumeHref } = get();
    if (resumeHref) set({ resumeHref: null });
    return resumeHref;
  },
}));

/** True while the app is laid out right-to-left (Arabic). */
export const isRTL = () => I18nManager.isRTL;
