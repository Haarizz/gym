import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { CheckCircle2, AlertCircle, Loader2, Phone, Dumbbell, ArrowRight, ChevronDown, UserCheck } from 'lucide-react';
import { walkInRegistrationService, type PublicWalkInPage } from '../utils/supabase/walk-in-registration-service';
import { leadFormErrorMessage } from '../utils/supabase/lead-form-service';
import {
  DEFAULT_DIAL_COUNTRY, DIAL_COUNTRIES, findDialCountry, formatNational, nationalDigits,
  parsePhoneInput, toInternational, validatePhone,
} from '../utils/phone-number';
import s from './PublicLeadForm.module.css';
import w from './PublicWalkIn.module.css';

// Public walk-in sign-up behind the gym's or a staff member's QR (/w/{tenant}/{branch}?s=code).
// Rendered standalone from main.tsx like the lead forms. Registering only queues the
// visitor — staff take payment and check them in at reception.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldKey = 'fullName' | 'phone' | 'email' | 'plan';

const FIELD_IDS: Record<FieldKey, string> = {
  fullName: 'wi-name',
  phone: 'wi-phone',
  email: 'wi-email',
  plan: 'wi-plan',
};

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function PublicWalkInPage({ tenantSlug, branchId }: { tenantSlug: string; branchId: string }) {
  const staffCode = useMemo(() => new URLSearchParams(window.location.search).get('s') || undefined, []);
  const [page, setPage] = useState<PublicWalkInPage | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [values, setValues] = useState({ fullName: '', phone: '', email: '', website: '' });
  const [planId, setPlanId] = useState<number | null>(null);
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_DIAL_COUNTRY);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // See public-lead-form.tsx: a blur error revealed mid-tap would move the button.
  const submitPressRef = useRef(false);

  // The app shell renders <body> at zoom 0.9; this standalone page must render 1:1.
  useLayoutEffect(() => {
    const previous = document.body.style.zoom;
    document.body.style.zoom = '1';
    return () => { document.body.style.zoom = previous; };
  }, []);

  useEffect(() => {
    walkInRegistrationService.getPublic(tenantSlug, branchId, staffCode)
      .then(data => {
        setPage(data);
        if (data.plans.length === 1) setPlanId(data.plans[0].id);
        setLoadState('ready');
        document.title = data.gym_name ? `${data.gym_name} — Walk-in registration` : 'Walk-in registration';
      })
      .catch(() => setLoadState('missing'));
  }, [tenantSlug, branchId, staffCode]);

  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues(v => ({ ...v, [field]: e.target.value }));

  const touch = (field: FieldKey) => () => {
    if (submitPressRef.current) return;
    setTouched(t => (t[field] ? t : { ...t, [field]: true }));
  };

  const handleSubmitPointerDown = () => {
    submitPressRef.current = true;
    window.setTimeout(() => { submitPressRef.current = false; }, 800);
  };

  const errors = useMemo(() => {
    const e: Partial<Record<FieldKey, string>> = {};
    if (!values.fullName.trim()) e.fullName = 'Please enter your name';
    const phoneError = validatePhone(phoneCountry, values.phone);
    if (phoneError) e.phone = phoneError;
    const email = values.email.trim();
    if (email && !EMAIL_PATTERN.test(email)) e.email = 'Please enter a valid email address';
    if (page && page.plans.length > 0 && planId == null) e.plan = 'Please choose a pass';
    return e;
  }, [values.fullName, values.phone, values.email, phoneCountry, page, planId]);

  const visibleError = (field: FieldKey) => ((submitAttempted || touched[field]) ? errors[field] : undefined);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const atEnd = el.selectionStart === el.value.length;
    const parsed = parsePhoneInput(el.value, phoneCountry, atEnd);
    setPhoneCountry(parsed.country);
    setValues(v => ({ ...v, phone: parsed.value }));
  };

  const handlePhoneBlur = () => {
    if (!values.phone.startsWith('+')) {
      setValues(v => ({ ...v, phone: formatNational(nationalDigits(v.phone), phoneCountry.groups) }));
    }
    touch('phone')();
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = findDialCountry(e.target.value);
    setPhoneCountry(country);
    setValues(v => ({ ...v, phone: parsePhoneInput(nationalDigits(v.phone), country).value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!page || submitting) return;
    setError(null);
    setSubmitAttempted(true);

    const firstInvalid = (Object.keys(FIELD_IDS) as FieldKey[]).find(k => errors[k]);
    if (firstInvalid) {
      const el = document.getElementById(FIELD_IDS[firstInvalid]);
      el?.focus();
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    try {
      await walkInRegistrationService.submitPublic(tenantSlug, branchId, {
        full_name: values.fullName.trim(),
        phone: toInternational(phoneCountry, values.phone),
        email: values.email.trim() || undefined,
        plan_id: planId ?? undefined,
        staff_code: staffCode,
        website: values.website || undefined,
      });
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      const status = (err as any)?.response?.status;
      setError(status === 429
        ? 'Too many attempts. Please wait a few minutes and try again.'
        : leadFormErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSubmitting(false);
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

  if (loadState === 'missing' || !page) {
    return shell(
      <section className={`${s.card} ${s.status}`}>
        <div className={s.statusIcon}><AlertCircle aria-hidden="true" /></div>
        <h1 className={s.statusTitle}>Self-registration isn't available</h1>
        <p className={s.statusText}>Please ask at reception and our team will sign you in.</p>
      </section>,
    );
  }

  const selectedPlan = page.plans.find(p => p.id === planId);

  if (done) {
    return shell(
      <section className={`${s.card} ${s.status}`} role="status">
        <div className={`${s.statusIcon} ${s.statusIconSuccess}`}><CheckCircle2 aria-hidden="true" /></div>
        <h1 className={s.statusTitle}>You're registered!</h1>
        <p className={s.statusText}>Show this screen at reception to pay and check in.</p>
        <div className={w.ticket}>
          <div className={w.ticketRow}><span>Name</span><span>{values.fullName.trim()}</span></div>
          <div className={w.ticketRow}><span>Phone</span><span>{toInternational(phoneCountry, values.phone)}</span></div>
          {selectedPlan && (
            <div className={w.ticketRow}>
              <span>Pass</span>
              <span>{selectedPlan.name} · {formatPrice(selectedPlan.price, page.currency_code)}</span>
            </div>
          )}
          {page.staff_name && <div className={w.ticketRow}><span>Helped by</span><span>{page.staff_name}</span></div>}
        </div>
      </section>,
    );
  }

  const nameError = visibleError('fullName');
  const phoneError = visibleError('phone');
  const emailError = visibleError('email');
  const planError = visibleError('plan');

  return shell(
    <section className={s.card} aria-labelledby="wi-title">
      <header className={s.header}>
        <div className={s.brandRow}>
          <span className={s.brandMark} aria-hidden="true"><Dumbbell size={17} strokeWidth={2.25} /></span>
          <span className={s.eyebrow}>{page.gym_name}{page.branch_name ? ` · ${page.branch_name}` : ''}</span>
        </div>
        <h1 id="wi-title" className={s.title}>Walk-in registration</h1>
        <p className={s.subtitle}>Sign up here, then pay at reception to get your pass.</p>
        {page.staff_name && (
          <span className={w.staffNote}><UserCheck aria-hidden="true" />Helped by {page.staff_name}</span>
        )}
      </header>

      <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
        <div className={s.section} role="group" aria-labelledby="wi-sec-contact">
          <h2 id="wi-sec-contact" className={s.sectionTitle}>Your details</h2>
          <div className={s.grid}>
            <Field id="wi-name" label="Full name" required error={nameError} full>
              <Input
                id="wi-name"
                className={s.control}
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                value={values.fullName}
                onChange={set('fullName')}
                onBlur={touch('fullName')}
                placeholder="e.g. Sara Ahmed"
                aria-required="true"
                aria-invalid={!!nameError || undefined}
                aria-describedby={nameError ? 'wi-name-error' : undefined}
              />
            </Field>

            <Field id="wi-phone" label="Phone number" required error={phoneError} full>
              <div className={`${s.control} ${s.phone}`} data-invalid={!!phoneError || undefined}>
                <div className={s.dial}>
                  <span className={s.flag} aria-hidden="true">{phoneCountry.flag}</span>
                  <span aria-hidden="true">+{phoneCountry.dial}</span>
                  <ChevronDown aria-hidden="true" />
                  <select
                    className={s.dialSelect}
                    value={phoneCountry.iso}
                    onChange={handleCountryChange}
                    aria-label={`Country code, ${phoneCountry.name} +${phoneCountry.dial}`}
                  >
                    {DIAL_COUNTRIES.map(c => (
                      <option key={c.iso} value={c.iso}>{c.flag} {c.name} (+{c.dial})</option>
                    ))}
                  </select>
                </div>
                <input
                  id="wi-phone"
                  className={s.phoneInput}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  enterKeyHint="next"
                  value={values.phone}
                  onChange={handlePhoneChange}
                  onBlur={handlePhoneBlur}
                  placeholder={phoneCountry.placeholder}
                  aria-required="true"
                  aria-invalid={!!phoneError || undefined}
                  aria-describedby={phoneError ? 'wi-phone-error' : undefined}
                />
              </div>
            </Field>

            <Field id="wi-email" label="Email" optional error={emailError} full>
              <Input
                id="wi-email"
                className={s.control}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                spellCheck={false}
                value={values.email}
                onChange={set('email')}
                onBlur={touch('email')}
                placeholder="you@example.com"
                aria-invalid={!!emailError || undefined}
                aria-describedby={emailError ? 'wi-email-error' : undefined}
              />
            </Field>
          </div>
        </div>

        {page.plans.length > 0 && (
          <div className={s.section} role="radiogroup" aria-labelledby="wi-sec-pass" aria-required="true">
            <h2 id="wi-sec-pass" className={s.sectionTitle}>Choose your pass</h2>
            <div className={w.plans}>
              {page.plans.map((plan, i) => (
                <label key={plan.id} className={w.plan}>
                  <input
                    id={i === 0 ? 'wi-plan' : undefined}
                    type="radio"
                    name="wi-plan"
                    checked={planId === plan.id}
                    onChange={() => { setPlanId(plan.id); touch('plan')(); }}
                  />
                  <span className={w.planBody}>
                    <span className={w.planName}>{plan.name}</span>
                    {plan.duration && <span className={w.planMeta}>{plan.duration}</span>}
                  </span>
                  <span className={w.planPrice}>{formatPrice(plan.price, page.currency_code)}</span>
                </label>
              ))}
            </div>
            {planError && <FieldError id="wi-plan-error" message={planError} style={{ marginTop: 8 }} />}
          </div>
        )}

        {/* Honeypot: off-screen and skipped by keyboard/autofill, so only bots fill it. */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
          <label htmlFor="wi-website">Website</label>
          <input id="wi-website" tabIndex={-1} autoComplete="off" value={values.website} onChange={set('website')} />
        </div>

        {error && (
          <div className={s.formAlert} role="alert">
            <AlertCircle aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className={s.actions}>
          <Button type="submit" className={s.submit} disabled={submitting} onPointerDown={handleSubmitPointerDown}>
            {submitting
              ? <><Loader2 className={s.spin} aria-hidden="true" />Registering…</>
              : <>Register<ArrowRight aria-hidden="true" /></>}
          </Button>
          <p className={s.footnote}>You'll pay at reception — nothing is charged here.</p>
          {page.branch_phone && (
            <p className={s.footnote}>
              <Phone aria-hidden="true" />
              Questions? <a href={`tel:${page.branch_phone}`}>{page.branch_phone}</a>
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

function Field({ id, label, required, optional, error, full, children }: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${s.field} ${full ? s.full : ''}`}>
      <label htmlFor={id} className={s.label}>
        {label}
        {required && <span className={s.required} aria-hidden="true">*</span>}
        {optional && <span className={s.optional}>(optional)</span>}
      </label>
      {children}
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  );
}

function FieldError({ id, message, style }: { id: string; message: string; style?: React.CSSProperties }) {
  return (
    <p id={id} className={s.error} style={style} aria-live="polite">
      <AlertCircle aria-hidden="true" />
      {message}
    </p>
  );
}
