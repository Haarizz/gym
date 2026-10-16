import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE, getDeviceLanguage } from './languages';
import en from './locales/en';
import hi from './locales/hi';
import ar from './locales/ar';
import de from './locales/de';
import fr from './locales/fr';
import es from './locales/es';
import zh from './locales/zh';
import ml from './locales/ml';
import ta from './locales/ta';

type Resource = { [key: string]: string | Resource };

/** Every CLDR plural category; a language only ever asks for its own subset. */
const PLURAL_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];

/**
 * i18next looks up the plural form a language's rules ask for (Arabic: zero, one,
 * two, few, many, other). A form missing from the locale would fall back to the
 * English text, so fill any that are missing from the same language's `_other`.
 */
function fillPluralForms(resource: Resource): Resource {
  const out: Resource = {};
  for (const [key, value] of Object.entries(resource)) {
    out[key] = typeof value === 'string' ? value : fillPluralForms(value);
  }
  for (const [key, value] of Object.entries(resource)) {
    if (typeof value !== 'string' || !key.endsWith('_other')) continue;
    const base = key.slice(0, -'_other'.length);
    for (const form of PLURAL_FORMS) {
      if (out[`${base}_${form}`] === undefined) out[`${base}_${form}`] = value;
    }
  }
  return out;
}

const withPlurals = (resource: object) => ({ translation: fillPluralForms(resource as Resource) });

export const resources = {
  en: { translation: en },
  hi: withPlurals(hi),
  ar: withPlurals(ar),
  de: withPlurals(de),
  fr: withPlurals(fr),
  es: withPlurals(es),
  zh: withPlurals(zh),
  ml: withPlurals(ml),
  ta: withPlurals(ta),
} as const;

// Initialised synchronously with the device language so the very first render is
// already translated; the persisted choice is applied by useLanguageStore.hydrate().
i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  initAsync: false,
  interpolation: { escapeValue: false },
});

export default i18n;
