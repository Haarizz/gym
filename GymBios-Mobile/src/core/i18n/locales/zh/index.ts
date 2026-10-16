import type { LocaleResource } from '../en';
import common from './common';
import settings from './settings';
import onboarding from './onboarding';
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
import dashboard from './dashboard';
import checkIn from './checkIn';
import schedule from './schedule';
import performance from './performance';
import ledger from './ledger';

const zh: LocaleResource = {
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

export default zh;
