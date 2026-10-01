import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { SearchableSelect } from '../components/shared/SearchableSelect';
import { CheckCircle2, AlertCircle, Loader2, Phone, Dumbbell, ArrowRight, ChevronDown } from 'lucide-react';
import { leadFormService, leadFormErrorMessage, type PublicLeadForm } from '../utils/supabase/lead-form-service';
import {
  DEFAULT_DIAL_COUNTRY, DIAL_COUNTRIES, findDialCountry, formatNational, nationalDigits,
  parsePhoneInput, toInternational, validatePhone,
} from '../utils/phone-number';
import s from './PublicLeadForm.module.css';

// Public page behind a gym's ad link (/f/{formKey}). Rendered standalone from
// main.tsx — no auth, branch or currency providers — like the legal pages.

const CONTACT_METHODS = [
  { value: 'phone', label: 'Phone call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
];

// Interest lists longer than this get a search box.
const SEARCH_THRESHOLD = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldKey = 'fullName' | 'phone' | 'email' | 'consent';

// DOM ids, also the focus order when jumping to the first invalid field.
const FIELD_IDS: Record<FieldKey, string> = {
  fullName: 'lf-name',
  phone: 'lf-phone',
  email: 'lf-email',
  consent: 'lf-consent',
};

export function PublicLeadFormPage({ formKey }: { formKey: string }) {
  const [form, setForm] = useState<PublicLeadForm | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [values, setValues] = useState({
    fullName: '', phone: '', email: '', interest: '', preferredContactMethod: 'phone', message: '', website: '',
  });
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_DIAL_COUNTRY);
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Set while the submit button is being pressed. Revealing a blur error at that
  // moment pushes the button down mid-tap and the click is lost; submit shows
  // every error anyway.
  const submitPressRef = useRef(false);

  // The app shell renders <body> at zoom 0.9. This page is standalone and must
  // render 1:1 — otherwise 16px inputs shrink below iOS Safari's no-zoom size
  // and viewport units come out short.
  useLayoutEffect(() => {
    const previous = document.body.style.zoom;
    document.body.style.zoom = '1';
    return () => { document.body.style.zoom = previous; };
  }, []);

  // utm_* params on the ad link tell the gym which ad/campaign the lead came from.
  const utm = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const get = (k: string) => params.get(k) || undefined;
    return {
      utmSource: get('utm_source'),
      utmMedium: get('utm_medium'),
      utmCampaign: get('utm_campaign'),
      utmContent: get('utm_content'),
    };
  }, []);

  useEffect(() => {
    leadFormService.getPublic(formKey)
      .then(data => {
        setForm(data);
        setLoadState('ready');
        document.title = data.gymName ? `${data.gymName} — ${data.headline || 'Get in touch'}` : 'Get in touch';
      })
      .catch(() => setLoadState('missing'));
  }, [formKey]);

  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues(v => ({ ...v, [field]: e.target.value }));

  const touch = (field: FieldKey) => () => {
    if (submitPressRef.current) return;
    setTouched(t => (t[field] ? t : { ...t, [field]: true }));
  };

  const handleSubmitPointerDown = () => {
    submitPressRef.current = true;
    // iOS fires blur/click well after pointerup, so release on a timer instead.
    window.setTimeout(() => { submitPressRef.current = false; }, 800);
  };

  const errors = useMemo(() => {
    const e: Partial<Record<FieldKey, string>> = {};
    if (!form) return e;
    if (!values.fullName.trim()) e.fullName = 'Please enter your name';
    const phoneError = validatePhone(phoneCountry, values.phone);
    if (phoneError) e.phone = phoneError;
    const email = values.email.trim();
    if (form.showEmail && form.requireEmail && !email) e.email = 'Please enter your email';
    else if (form.showEmail && email && !EMAIL_PATTERN.test(email)) e.email = 'Please enter a valid email address';
    if (!consent) e.consent = 'Please agree to be contacted so we can get back to you';
    return e;
  }, [form, values.fullName, values.phone, values.email, phoneCountry, consent]);

  const visibleError = (field: FieldKey) => ((submitAttempted || touched[field]) ? errors[field] : undefined);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    // Reformat only while typing at the end, so editing mid-number doesn't jump the caret.
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
    if (!form || submitting) return;
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
      const res = await leadFormService.submitPublic(formKey, {
        fullName: values.fullName.trim(),
        phone: toInternational(phoneCountry, values.phone),
        email: values.email.trim() || undefined,
        interest: values.interest || undefined,
        preferredContactMethod: values.preferredContactMethod || undefined,
        message: values.message.trim() || undefined,
        consent,
        website: values.website || undefined,
        ...utm,
      });
      setSuccessMessage(res.message || form.successMessage || 'Thank you! Our team will contact you shortly.');
    } catch (err) {
      const status = (err as any)?.response?.status;
      setError(status === 429
        ? 'Too many attempts. Please wait a few minutes and try again.'
        : leadFormErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const page = (children: React.ReactNode, narrow = false) => (
    <div className={s.page}>
      <div className={s.backdrop} aria-hidden="true" />
      <main className={`${s.shell} ${narrow ? s.shellNarrow : ''}`}>{children}</main>
    </div>
  );

  if (loadState === 'loading') {
    return page(
      <div className={s.loader} role="status" aria-label="Loading form">
        <Loader2 className={s.spin} />
      </div>,
      true,
    );
  }

  if (loadState === 'missing' || !form) {
    return page(
      <section className={`${s.card} ${s.status}`}>
        <div className={s.statusIcon}><AlertCircle aria-hidden="true" /></div>
        <h1 className={s.statusTitle}>This form is no longer available</h1>
        <p className={s.statusText}>The link may have expired. Please contact the gym directly.</p>
      </section>,
      true,
    );
  }

  if (successMessage) {
    return page(
      <section className={`${s.card} ${s.status}`} role="status">
        <div className={`${s.statusIcon} ${s.statusIconSuccess}`}><CheckCircle2 aria-hidden="true" /></div>
        <h1 className={s.statusTitle}>You're all set!</h1>
        <p className={s.statusText}>{successMessage}</p>
        {form.branchPhone && (
          <p className={s.footnote}>
            Can't wait? Call us at <a href={`tel:${form.branchPhone}`}>{form.branchPhone}</a>
          </p>
        )}
      </section>,
      true,
    );
  }

  const headline = form.headline || 'Start your fitness journey';
  // A description that only repeats the headline adds nothing — use the default line instead.
  const description = form.description && form.description.trim().toLowerCase() !== headline.trim().toLowerCase()
    ? form.description
    : 'Leave your details and our team will get in touch with you.';
  const showInterest = !!(form.showInterest && form.interestOptions && form.interestOptions.length > 0);
  const interestOptions = (form.interestOptions ?? []).map(opt => ({ value: opt, label: opt }));
  const contactOptions = CONTACT_METHODS.filter(m => m.value !== 'email' || form.showEmail);

  const nameError = visibleError('fullName');
  const phoneError = visibleError('phone');
  const emailError = visibleError('email');
  const consentError = visibleError('consent');

  return page(
    <section className={s.card} aria-labelledby="lf-title">
      <header className={s.header}>
        <div className={s.brandRow}>
          <span className={s.brandMark} aria-hidden="true"><Dumbbell size={17} strokeWidth={2.25} /></span>
          <span className={s.eyebrow}>{form.gymName}{form.branchName ? ` · ${form.branchName}` : ''}</span>
        </div>
        <h1 id="lf-title" className={s.title}>{headline}</h1>
        <p className={s.subtitle}>{description}</p>
      </header>

      <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
        <div className={s.section} role="group" aria-labelledby="lf-sec-contact">
          <h2 id="lf-sec-contact" className={s.sectionTitle}>Contact details</h2>
          <div className={s.grid}>
            <Field id="lf-name" label="Full name" required error={nameError} full>
              <Input
                id="lf-name"
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
                aria-describedby={nameError ? 'lf-name-error' : undefined}
              />
            </Field>

            <Field id="lf-phone" label="Phone number" required error={phoneError} full={!form.showEmail}>
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
                  id="lf-phone"
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
                  aria-describedby={phoneError ? 'lf-phone-error' : undefined}
                />
              </div>
            </Field>

            {form.showEmail && (
              <Field id="lf-email" label="Email" required={form.requireEmail} optional={!form.requireEmail} error={emailError}>
                <Input
                  id="lf-email"
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
                  aria-required={form.requireEmail || undefined}
                  aria-invalid={!!emailError || undefined}
                  aria-describedby={emailError ? 'lf-email-error' : undefined}
                />
              </Field>
            )}
          </div>
        </div>

        <div className={s.section} role="group" aria-labelledby="lf-sec-details">
          <h2 id="lf-sec-details" className={s.sectionTitle}>Your preferences</h2>
          <div className={s.grid}>
            {showInterest && (
              <Field id="lf-interest" label="What are you interested in?">
                <SearchableSelect
                  id="lf-interest"
                  value={values.interest}
                  options={interestOptions}
                  onChange={v => setValues(st => ({ ...st, interest: v }))}
                  placeholder="Choose an option"
                  searchPlaceholder="Search options…"
                  emptyText="No matching options"
                  searchable={interestOptions.length > SEARCH_THRESHOLD}
                  chevron="down"
                  className={`${s.control} ${s.selectTrigger}`}
                  contentClassName={s.menu}
                />
              </Field>
            )}
            <Field id="lf-contact" label="How should we contact you?" full={!showInterest}>
              <SearchableSelect
                id="lf-contact"
                value={values.preferredContactMethod}
                options={contactOptions}
                onChange={v => v && setValues(st => ({ ...st, preferredContactMethod: v }))}
                placeholder="Choose an option"
                searchable={false}
                chevron="down"
                className={`${s.control} ${s.selectTrigger}`}
                contentClassName={s.menu}
              />
            </Field>
            <Field id="lf-message" label="Message" optional full>
              <Textarea
                id="lf-message"
                className={`${s.control} ${s.textarea}`}
                value={values.message}
                onChange={set('message')}
                placeholder="Your goals, preferred timing, questions…"
                rows={4}
              />
            </Field>
          </div>
        </div>

        {/* Honeypot: off-screen and skipped by keyboard/autofill, so only bots fill it. */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
          <label htmlFor="lf-website">Website</label>
          <input id="lf-website" tabIndex={-1} autoComplete="off" value={values.website} onChange={set('website')} />
        </div>

        <div className={s.section}>
          <label htmlFor="lf-consent" className={s.consent} data-invalid={!!consentError || undefined}>
            <Checkbox
              id="lf-consent"
              className={s.checkbox}
              checked={consent}
              onCheckedChange={v => { setConsent(v === true); touch('consent')(); }}
              aria-required="true"
              aria-invalid={!!consentError || undefined}
              aria-describedby={consentError ? 'lf-consent-error' : undefined}
            />
            <span>
              I agree to be contacted by {form.gymName || 'the gym'} by phone, WhatsApp or email about memberships and offers.
              {' '}Read our{' '}
              <a className={s.link} href={form.privacyPolicyUrl || '/privacy-policy'} target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>.
            </span>
          </label>
          {consentError && <FieldError id="lf-consent-error" message={consentError} style={{ marginTop: 8 }} />}
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
              ? <><Loader2 className={s.spin} aria-hidden="true" />Submitting…</>
              : <>Submit<ArrowRight aria-hidden="true" /></>}
          </Button>

          {form.branchPhone && (
            <p className={s.footnote}>
              <Phone aria-hidden="true" />
              Prefer to talk? <a href={`tel:${form.branchPhone}`}>{form.branchPhone}</a>
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
