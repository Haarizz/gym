import axios from 'axios';

// Public referral-link lookup behind /ref/{code} (PublicReferralController).
// snake_case on the wire (global Jackson naming).

export interface PublicReferral {
  /** APP: a member's code from the mobile app, claimed in the app. GYM: a staff-logged code, applied at reception. */
  kind: 'APP' | 'GYM';
  code: string;
  gym_name?: string;
  referrer_first_name?: string;
}

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

export const publicReferralService = {
  lookup: async (code: string): Promise<PublicReferral> =>
    (await publicApi.get<PublicReferral>(`/public/referrals/${encodeURIComponent(code)}`)).data,
};

/** Custom-scheme link the mobile app handles (app.json "scheme"); works without verified app links. */
export const appReferralDeepLink = (code: string) => `gymbiosmobile://ref/${encodeURIComponent(code)}`;

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.anandu389.GymBiosMobile';
/** Unset until the iOS app is listed; the App Store button stays hidden until then. */
export const APP_STORE_URL: string | undefined = import.meta.env.VITE_APP_STORE_URL || undefined;
