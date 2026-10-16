/**
 * English source strings — the reference shape for every other locale.
 * Other locales may leave keys out; missing keys fall back to these.
 */
import common from './common';
import settings from './settings';
import memberHome from './memberHome';
import bookings from './bookings';
import membership from './membership';
import team from './team';
import gymRating from './gymRating';
import enquiries from './enquiries';
import centers from './centers';
import payments from './payments';
import paymentSheet from './paymentSheet';
import referrals from './referrals';
import feedback from './feedback';
import family from './family';
import community from './community';
import profile from './profile';
import shared from './shared';
import auth from './auth';
import onboarding from './onboarding';
import dashboard from './dashboard';
import checkIn from './checkIn';
import schedule from './schedule';
import performance from './performance';
import ledger from './ledger';

const en = {
  ...common,
  ...settings,
  ...onboarding,
  ...memberHome,
  ...bookings,
  ...membership,
  ...team,
  ...gymRating,
  ...enquiries,
  ...centers,
  ...payments,
  ...paymentSheet,
  ...referrals,
  ...feedback,
  ...family,
  ...community,
  ...profile,
  ...shared,
  ...auth,
  ...dashboard,
  ...checkIn,
  ...schedule,
  ...performance,
  ...ledger,
};

export default en;

type DeepStrings<T> = { [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> };
/** Extra CLDR plural forms some languages need (e.g. Arabic); English only has _one/_other. */
type ExtraPluralForms = { [key: `${string}_${'zero' | 'two' | 'few' | 'many'}`]: string };
type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> } & ExtraPluralForms;

export type Translations = DeepStrings<typeof en>;
/** Shape for non-English locales: any key may be left out and falls back to English. */
export type LocaleResource = DeepPartial<typeof en>;
