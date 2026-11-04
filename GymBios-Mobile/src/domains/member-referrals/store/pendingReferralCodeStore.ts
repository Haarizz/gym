import { create } from 'zustand';

/**
 * A referral code that arrived through a shared link (https://<web>/ref/<code> or
 * gymbiosmobile://ref/<code>, see app/+native-intent.tsx). Held until a member reaches
 * home, where the claim sheet opens with it filled in; cleared once that sheet closes.
 * In memory only: a link opened before installing the app can't carry the code over,
 * so the web landing page shows it to type or paste instead.
 */
interface PendingReferralCodeState {
  code: string | null;
  setCode: (code: string | null) => void;
}

export const usePendingReferralCodeStore = create<PendingReferralCodeState>((set) => ({
  code: null,
  setCode: (code) => set({ code }),
}));

const REFERRAL_PATH = /(?:^|\/)ref\/([A-Za-z0-9]+)\/?(?:[?#]|$)/;

/** The referral code in an incoming link's path or URL, if it is a referral link. */
export function parseReferralLink(pathOrUrl: string): string | null {
  const match = pathOrUrl.match(REFERRAL_PATH);
  return match ? match[1] : null;
}
