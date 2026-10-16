import { getLocales } from 'expo-localization';

export interface AppLanguage {
  code: string;
  /** Name in the language itself — what the picker shows. */
  nativeName: string;
  englishName: string;
  /** Greeting shown on the language picker card. */
  hello: string;
  rtl: boolean;
}

/**
 * Languages the app ships translations for, in picker order. Adding one means
 * adding its locale file in ./locales, registering it in ./i18n, and listing it
 * in the expo-localization `supportedLocales` in app.json.
 */
export const LANGUAGES = [
  { code: 'en', nativeName: 'English', englishName: 'English', hello: 'Hi', rtl: false },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', hello: 'नमस्ते', rtl: false },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', hello: 'مرحبًا', rtl: true },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', hello: 'Hallo', rtl: false },
  { code: 'fr', nativeName: 'Français', englishName: 'French', hello: 'Bonjour', rtl: false },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', hello: 'Hola', rtl: false },
  { code: 'zh', nativeName: '中文', englishName: 'Chinese', hello: '你好', rtl: false },
] as const satisfies readonly AppLanguage[];

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

/**
 * Languages with partial translations kept in ./locales but not offered in the
 * picker for now. To enable one, move it back into LANGUAGES and app.json:
 *   { code: 'ml', nativeName: 'മലയാളം', englishName: 'Malayalam', hello: 'നമസ്കാരം', rtl: false }
 *   { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', hello: 'வணக்கம்', rtl: false }
 */
export type DeferredLanguageCode = 'ml' | 'ta';

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export function isLanguageCode(value: unknown): value is LanguageCode {
  return LANGUAGES.some((lang) => lang.code === value);
}

export function getLanguage(code: LanguageCode): AppLanguage {
  return LANGUAGES.find((lang) => lang.code === code) ?? LANGUAGES[0];
}

/** First of the device's preferred languages that the app supports, else English. */
export function getDeviceLanguage(): LanguageCode {
  for (const locale of getLocales()) {
    if (isLanguageCode(locale.languageCode)) return locale.languageCode;
  }
  return DEFAULT_LANGUAGE;
}
