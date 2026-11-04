import React, { useEffect, useLayoutEffect, useState } from 'react';
import { AlertCircle, Check, Copy, Dumbbell, Loader2, Smartphone } from 'lucide-react';
import {
  APP_STORE_URL, PLAY_STORE_URL, appReferralDeepLink, publicReferralService, type PublicReferral,
} from '../utils/supabase/public-referral-service';
import s from './PublicLeadForm.module.css';
import r from './PublicReferral.module.css';

// Landing page for shared referral links (/ref/{code}). Rendered standalone from
// main.tsx like the lead forms and walk-in page.
//  - APP codes (shared from the mobile app): "Open in app" hands the code to the app
//    through its custom scheme, which opens the claim sheet with it filled in. Anyone
//    without the app installs it and enters (or pastes) the code after signing up.
//  - GYM codes (logged by staff on the web Referrals page): shown to quote at reception.

export function PublicReferralPage({ code }: { code: string }) {
  const [referral, setReferral] = useState<PublicReferral | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing' | 'busy'>('loading');
  const [copied, setCopied] = useState(false);

  // The app shell renders <body> at zoom 0.9; this standalone page must render 1:1.
  useLayoutEffect(() => {
    const previous = document.body.style.zoom;
    document.body.style.zoom = '1';
    return () => { document.body.style.zoom = previous; };
  }, []);

  useEffect(() => {
    publicReferralService.lookup(code)
      .then(data => {
        setReferral(data);
        setLoadState('ready');
        document.title = data.gym_name ? `Join ${data.gym_name} — GymBios` : 'Your GymBios invite';
      })
      .catch(err => setLoadState((err as any)?.response?.status === 429 ? 'busy' : 'missing'));
  }, [code]);

  const copyCode = async () => {
    if (!referral) return;
    try {
      await navigator.clipboard.writeText(referral.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context) — the code is on screen to copy by hand.
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className={s.page}>
      <div className={s.backdrop} aria-hidden="true" />
      <main className={`${s.shell} ${s.shellNarrow}`}>{children}</main>
    </div>
  );

  if (loadState === 'loading') {
    return shell(
      <div className={s.loader} role="status" aria-label="Loading">
        <Loader2 className={s.spin} />
      </div>,
    );
  }

  if (loadState !== 'ready' || !referral) {
    return shell(
      <section className={`${s.card} ${s.status}`}>
        <div className={s.statusIcon}><AlertCircle aria-hidden="true" /></div>
        <h1 className={s.statusTitle}>
          {loadState === 'busy' ? 'Too many requests' : "This invite link isn't valid"}
        </h1>
        <p className={s.statusText}>
          {loadState === 'busy'
            ? 'Please wait a few minutes and open the link again.'
            : 'Ask the person who invited you to send their link or code again.'}
        </p>
      </section>,
    );
  }

  const gym = referral.gym_name || 'the gym';
  const who = referral.referrer_first_name;
  const isApp = referral.kind === 'APP';

  return shell(
    <section className={s.card} aria-labelledby="ref-title">
      <header className={s.header}>
        <div className={s.brandRow}>
          <span className={s.brandMark} aria-hidden="true"><Dumbbell size={17} strokeWidth={2.25} /></span>
          <span className={s.eyebrow}>{gym}</span>
        </div>
        <h1 id="ref-title" className={s.title}>
          {who ? `${who} invited you to ${gym}` : `You're invited to ${gym}`}
        </h1>
        <p className={s.subtitle}>
          {isApp
            ? 'Join through the GymBios app with this referral code so you both get the referral reward.'
            : 'Quote this referral code at reception when you join.'}
        </p>
      </header>

      <div className={r.codeBox}>
        <div>
          <div className={r.codeLabel}>Referral code</div>
          <div className={r.code}>{referral.code}</div>
        </div>
        <button type="button" className={r.copy} onClick={copyCode} aria-label="Copy referral code">
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {isApp && (
        <>
          <a className={`${s.submit} ${r.primary}`} href={appReferralDeepLink(referral.code)}>
            <Smartphone aria-hidden="true" />
            Open in GymBios app
          </a>

          <ol className={r.steps}>
            <li>Don't have the app yet? Install GymBios.</li>
            <li>Sign up and finish your profile.</li>
            <li>When asked for a referral code, enter <strong>{referral.code}</strong>. Opening this link with the app installed fills it in for you.</li>
          </ol>

          <div className={r.stores}>
            <a className={r.store} href={PLAY_STORE_URL} target="_blank" rel="noreferrer">Get it on Google Play</a>
            {APP_STORE_URL && (
              <a className={r.store} href={APP_STORE_URL} target="_blank" rel="noreferrer">Download on the App Store</a>
            )}
          </div>
        </>
      )}
    </section>,
  );
}
