import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import {
  AlertCircle, ArrowLeft, ArrowRight, Award, Banknote, Calendar, CheckCircle, CheckCircle2, ChevronDown, Clock,
  ChevronRight, CreditCard, Dumbbell, Plus, Trash2, X, Loader2, Lock, Mail, MapPin, Phone, Radio, Sparkles, Star, Users, Video,
} from 'lucide-react';
import {
  servicePortfolioService, apiErrorMessage,
  type ApplicationFamilyMember, type ApplicationPaymentMethod, type ApplicationReceipt, type PortfolioPlan, type PortfolioSession, type PortfolioTrainer,
  type PublicPortfolio,
} from '../utils/supabase/service-portfolio-service';
import {
  DEFAULT_DIAL_COUNTRY, DIAL_COUNTRIES, findDialCountry, formatNational, nationalDigits,
  parsePhoneInput, toInternational, validatePhone, type DialCountry,
} from '../utils/phone-number';
import { resolveBackendImageUrl } from '../utils/resolve-image-url';
import s from './PublicLeadForm.module.css';
import j from './PublicJoin.module.css';
import w from './PublicWalkIn.module.css';

// Public Service Portfolios page behind the admin's share link (/join/{tenant}/{branch}/{token}).
// Rendered standalone from main.tsx like the lead forms. A visitor browses the gym, picks a
// plan, fills in their details and pays online (simulated card checkout) or chooses cash at
// the gym. Either way the gym must approve the application before the membership starts.

type PlanCategory = 'individual' | 'family' | 'couple';
const PLAN_CATEGORIES: { id: PlanCategory; label: string }[] = [
  { id: 'individual', label: 'Individual' },
  { id: 'family', label: 'Family' },
  { id: 'couple', label: 'Couple' },
];
// Family / Couple come from the plan type; everything else counts as an individual plan.
function planCategory(p: PortfolioPlan): PlanCategory {
  const t = (p.plan_type || '').trim().toLowerCase();
  return t === 'family' || t === 'couple' ? t : 'individual';
}

// ── Family / Couple households ──
// The applicant is the family head; these rows are everyone joining with them.
interface FamilyRow {
  key: number;
  name: string;
  relationship: string;
  gender: string;
  dob: string;
  child: boolean;
  phone: string;
  email: string;
}
type FamilyField = 'name' | 'relationship' | 'gender' | 'dob' | 'email';

// Same choices as the desk's Add Member family section; the gender each implies.
const RELATIONSHIPS: { value: string; gender: 'Male' | 'Female' | null }[] = [
  { value: 'Wife', gender: 'Female' },
  { value: 'Husband', gender: 'Male' },
  { value: 'Son', gender: 'Male' },
  { value: 'Daughter', gender: 'Female' },
  { value: 'Father', gender: 'Male' },
  { value: 'Mother', gender: 'Female' },
  { value: 'Brother', gender: 'Male' },
  { value: 'Sister', gender: 'Female' },
  { value: 'Other', gender: null },
];
const COUPLE_RELATIONSHIPS = ['Wife', 'Husband', 'Other'];
const GENDERS = ['Male', 'Female', 'Other'];

type BranchAccess = NonNullable<PublicPortfolio['access']>;
/** Same rule as BranchAccessPolicy: Ladies Only takes Female, Men Only takes Male, Mixed takes anyone. */
const genderAllowed = (access: BranchAccess, gender: string) =>
  access === 'MIXED' || (access === 'LADIES_ONLY' ? gender === 'Female' : gender === 'Male');
/** The one gender a Ladies Only / Men Only branch takes; '' for a mixed branch. */
const onlyGender = (access: BranchAccess) => (access === 'LADIES_ONLY' ? 'Female' : access === 'MEN_ONLY' ? 'Male' : '');
const MAX_FAMILY_ROWS = 20;

let familyKey = 0;
const newFamilyRow = (): FamilyRow =>
  ({ key: ++familyKey, name: '', relationship: '', gender: '', dob: '', child: false, phone: '', email: '' });

const ageOn = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : (Date.now() - d.getTime()) / (365.25 * 864e5);
};
/** Under 18 — from the date of birth when given (the server works it out the same way). */
const isChild = (r: FamilyRow) => {
  const age = r.dob ? ageOn(r.dob) : null;
  return age != null ? age < 18 : r.child;
};
const rowGender = (r: FamilyRow) => r.gender || RELATIONSHIPS.find(x => x.value === r.relationship)?.gender || '';

/** What the household pays: per person (applicant included) when the plan is priced that way, else the plan price. */
function householdTotal(plan: PortfolioPlan, headcount: number) {
  const h = plan.household;
  if (!h?.price_per_member) return plan.effective_price;
  let total = 0;
  for (let i = 0; i < headcount; i++) {
    total += h.max_members && i >= h.max_members ? (h.additional_member_price ?? h.price_per_member) : h.price_per_member;
  }
  return total;
}

/** The plan's member caps as one message, or null when the household fits. Mirrors MemberService.enforceFamilyMemberCaps. */
function householdCapError(plan: PortfolioPlan, rows: FamilyRow[]): string | null {
  const h = plan.household;
  if (!h) return null;
  if (h.kind === 'couple') {
    if (rows.length !== 1) return 'A couple plan is for you and one partner.';
    if (isChild(rows[0])) return 'A couple plan is for you and one adult partner.';
    return null;
  }
  if (rows.length === 0) return 'Add at least one family member.';
  const adults = 1 + rows.filter(r => !isChild(r)).length;
  const children = rows.filter(isChild).length;
  if (h.max_adults && adults > h.max_adults) return `This plan allows up to ${h.max_adults} adults, including you.`;
  if (h.max_children && children > h.max_children) return `This plan allows up to ${h.max_children} children.`;
  if (h.max_members && adults + children > h.max_members && !h.allow_additional_members) {
    return `This plan allows up to ${h.max_members} people, including you.`;
  }
  return null;
}

/** One line on the plan card saying who the plan covers. */
function householdLine(plan: PortfolioPlan) {
  const h = plan.household;
  if (!h) return null;
  if (h.kind === 'couple') return 'For you and one partner';
  const parts: string[] = [];
  if (h.max_members) parts.push(`Up to ${h.max_members} people${h.allow_additional_members ? ' (more can be added)' : ''}`);
  if (h.max_adults) parts.push(`${h.max_adults} adults`);
  if (h.max_children) parts.push(`${h.max_children} children`);
  return parts.length ? parts.join(' · ') : 'For you and your family';
}

/** Number of accent colours cards cycle through (data-tone 0–4 in PublicJoin.module.css). */
const TONES = 5;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEST_CARD = '4242 4242 4242 4242';

type View = 'browse' | 'details' | 'payment' | 'done';
type DetailKey = 'fullName' | 'phone' | 'email' | 'gender' | 'dob' | 'ecPhone';
type PayKey = 'card' | 'terms';

const DETAIL_IDS: Record<DetailKey, string> = {
  fullName: 'jn-name',
  phone: 'jn-phone',
  email: 'jn-email',
  gender: 'jn-gender',
  dob: 'jn-dob',
  ecPhone: 'jn-ec-phone',
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

const hhmm = (t?: string) => (t ? t.slice(0, 5) : '');

function dateParts(iso?: string) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return {
    day: d.getDate(),
    month: d.toLocaleDateString(undefined, { month: 'short' }),
    weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
  };
}

// ── Card helpers (mirror the server's SimulatedCardCheckout checks) ──────────────

const cardDigits = (v: string) => v.replace(/\D/g, '').slice(0, 19);

function cardBrand(digits: string): string | null {
  if (/^4/.test(digits)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'MASTERCARD';
  if (/^3[47]/.test(digits)) return 'AMEX';
  if (/^(6011|65|64[4-9])/.test(digits)) return 'DISCOVER';
  if (/^3(0[0-5]|[68])/.test(digits)) return 'DINERS';
  if (/^35/.test(digits)) return 'JCB';
  if (/^62/.test(digits)) return 'UNIONPAY';
  return null;
}

function formatCardNumber(digits: string) {
  if (/^3[47]/.test(digits)) {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(' ');
  }
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function luhn(digits: string) {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

function formatExpiry(raw: string, previous: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  // Deleting the slash should delete the month digit before it, not get stuck.
  if (raw.length < previous.length && previous.endsWith(' / ') && digits.length === 2) return digits.slice(0, 1);
  if (digits.length === 1 && Number(digits) > 1) return `0${digits} / `;
  if (digits.length >= 2) return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
  return digits;
}

function parseExpiry(value: string): { month: number; year: number } | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 4) return null;
  const month = Number(digits.slice(0, 2));
  const year = 2000 + Number(digits.slice(2));
  if (month < 1 || month > 12) return null;
  return { month, year };
}

function cardError(number: string, expiry: string, cvc: string): string | null {
  const digits = cardDigits(number);
  if (!digits) return 'Enter your card number';
  if (digits.length < 13 || !luhn(digits)) return 'Your card number is invalid';
  const exp = parseExpiry(expiry);
  if (!exp) return "Your card's expiration date is incomplete";
  const now = new Date();
  if (exp.year < now.getFullYear() || (exp.year === now.getFullYear() && exp.month < now.getMonth() + 1)) {
    return "Your card's expiration date is in the past";
  }
  const cvcLength = /^3[47]/.test(digits) ? 4 : 3;
  if (cvc.length !== cvcLength) return "Your card's security code is incomplete";
  return null;
}

export function PublicJoinPage({ tenantSlug, branchId, token }: { tenantSlug: string; branchId: string; token: string }) {
  const [page, setPage] = useState<PublicPortfolio | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [view, setView] = useState<View>('browse');
  // Browse view shows one section at a time; kept across details/payment so "back" returns here.
  const [tab, setTab] = useState('plans');
  // +1 when moving to a tab on the right, -1 to the left: the new content slides in from that side.
  const [tabDir, setTabDir] = useState<1 | -1>(1);
  // Position of the highlight pill that glides between tab chips.
  const navRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  // Which edges of the scrolling tab bar hide more tabs (shown as a soft fade).
  const [navFade, setNavFade] = useState({ left: false, right: false });
  const navCentredRef = useRef(false);
  const [planFilter, setPlanFilter] = useState<PlanCategory | 'all'>('all');
  const [openTrainer, setOpenTrainer] = useState<PortfolioTrainer | null>(null);
  // The profile panel portals into the page root so it keeps the page's colour variables.
  const [pageEl, setPageEl] = useState<HTMLDivElement | null>(null);
  const [plan, setPlan] = useState<PortfolioPlan | null>(null);
  const [family, setFamily] = useState<FamilyRow[]>([]);
  const [familyTouched, setFamilyTouched] = useState<Record<string, boolean>>({});

  const [details, setDetails] = useState({
    fullName: '', phone: '', email: '', gender: '', dob: '', address: '',
    ecName: '', ecPhone: '', notes: '',
  });
  const [phoneCountry, setPhoneCountry] = useState<DialCountry>(DEFAULT_DIAL_COUNTRY);
  const [touched, setTouched] = useState<Partial<Record<DetailKey | PayKey, boolean>>>({});
  const [detailsAttempted, setDetailsAttempted] = useState(false);

  const [method, setMethod] = useState<ApplicationPaymentMethod>('ONLINE');
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [payAttempted, setPayAttempted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ApplicationReceipt | null>(null);
  // See public-lead-form.tsx: a blur error revealed mid-tap would move the button.
  const submitPressRef = useRef(false);

  // The app shell renders <body> at zoom 0.9; this standalone page must render 1:1.
  useLayoutEffect(() => {
    const previous = document.body.style.zoom;
    document.body.style.zoom = '1';
    return () => { document.body.style.zoom = previous; };
  }, []);

  // Keep the tab pill under the selected chip — re-measured when the chip resizes (fonts, viewport).
  useLayoutEffect(() => {
    const chip = navRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!chip) { setPill(null); return; }
    const place = () => setPill({ left: chip.offsetLeft, width: chip.offsetWidth });
    place();
    // Bring the selected chip to the middle of the bar — only the bar scrolls, never the page.
    const bar = navRef.current!;
    if (bar.scrollWidth > bar.clientWidth) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      bar.scrollTo({
        left: chip.offsetLeft - (bar.clientWidth - chip.offsetWidth) / 2,
        behavior: navCentredRef.current && !reduce ? 'smooth' : 'auto',
      });
    }
    navCentredRef.current = true;
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
    observer?.observe(chip);
    return () => observer?.disconnect();
  }, [tab, view, loadState, page]);

  useEffect(() => {
    const bar = navRef.current;
    if (!bar) return;
    const update = () => {
      const left = bar.scrollLeft > 4;
      const right = bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 4;
      setNavFade(f => (f.left === left && f.right === right ? f : { left, right }));
    };
    update();
    bar.addEventListener('scroll', update, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(bar);
    return () => {
      bar.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, [view, loadState, page]);

  useEffect(() => {
    servicePortfolioService.getPublic(tenantSlug, branchId, token)
      .then(data => {
        setPage(data);
        if (!data.online_payment_enabled) setMethod('CASH');
        const only = onlyGender(data.access ?? 'MIXED');
        if (only) setDetails(v => (v.gender ? v : { ...v, gender: only }));
        setLoadState('ready');
        const name = [data.gym_name, data.branch_name].filter(Boolean).join(' · ');
        document.title = name ? `${name} — Plans & membership` : 'Plans & membership';
      })
      .catch(() => setLoadState('missing'));
  }, [tenantSlug, branchId, token]);

  const money = (n: number) => formatMoney(n, page?.currency_code || 'AED');

  const goTo = (next: View) => {
    setView(next);
    setError(null);
    window.scrollTo({ top: 0 });
  };

  const choosePlan = (p: PortfolioPlan) => {
    if (p.id !== plan?.id) {
      // A Family / Couple plan starts with one row to fill in; switching plans starts over.
      setFamily(p.household ? [newFamilyRow()] : []);
      setFamilyTouched({});
    }
    setPlan(p);
    goTo('details');
  };

  const access: BranchAccess = page?.access ?? 'MIXED';
  const branchGender = onlyGender(access);
  const genderOptions = GENDERS.filter(g => genderAllowed(access, g));
  const household = plan?.household ?? null;
  const familyRows = household ? family : [];
  const amountDue = plan ? householdTotal(plan, 1 + familyRows.length) : 0;

  const touch = (field: DetailKey | PayKey) => () => {
    if (submitPressRef.current) return;
    setTouched(t => (t[field] ? t : { ...t, [field]: true }));
  };

  const handlePressStart = () => {
    submitPressRef.current = true;
    window.setTimeout(() => { submitPressRef.current = false; }, 800);
  };

  const setDetail = (field: keyof typeof details) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setDetails(v => ({ ...v, [field]: e.target.value }));

  // ── Validation ──
  const detailErrors = useMemo(() => {
    const e: Partial<Record<DetailKey, string>> = {};
    if (!details.fullName.trim()) e.fullName = 'Please enter your full name';
    const phoneError = validatePhone(phoneCountry, details.phone);
    if (phoneError) e.phone = phoneError;
    const email = details.email.trim();
    if (!email) e.email = 'Please enter your email address';
    else if (!EMAIL_PATTERN.test(email)) e.email = 'Please enter a valid email address';
    if (!details.gender) e.gender = 'Please select your gender';
    if (!details.dob) {
      e.dob = 'Please enter your date of birth';
    } else {
      const dob = new Date(`${details.dob}T00:00:00`);
      const age = (Date.now() - dob.getTime()) / (365.25 * 864e5);
      if (Number.isNaN(age) || age < 10 || age > 110) e.dob = 'Please enter a valid date of birth';
    }
    const ec = details.ecPhone.replace(/\D/g, '');
    if (details.ecPhone.trim() && ec.length < 7) e.ecPhone = 'Please enter a valid phone number';
    return e;
  }, [details, phoneCountry]);

  const familyErrors = useMemo(() => {
    const out: Record<number, Partial<Record<FamilyField, string>>> = {};
    const emails = new Set<string>(details.email.trim() ? [details.email.trim().toLowerCase()] : []);
    for (const r of familyRows) {
      const e: Partial<Record<FamilyField, string>> = {};
      if (!r.name.trim()) e.name = 'Please enter their full name';
      if (!r.relationship) e.relationship = 'Please choose how they are related to you';
      else if (!rowGender(r)) e.gender = 'Please select their gender';
      if (r.dob) {
        const age = ageOn(r.dob);
        if (age == null || age < 0 || age > 110) e.dob = 'Please enter a valid date of birth';
      }
      const email = r.email.trim().toLowerCase();
      if (email && !isChild(r)) {
        if (!EMAIL_PATTERN.test(email)) e.email = 'Please enter a valid email address or leave it blank';
        else if (emails.has(email)) e.email = 'Each person needs their own email — use another or leave it blank';
        else emails.add(email);
      }
      if (Object.keys(e).length) out[r.key] = e;
    }
    return out;
  }, [familyRows, details.email]);
  const householdError = plan ? householdCapError(plan, familyRows) : null;

  const familyError = (r: FamilyRow, f: FamilyField) =>
    (detailsAttempted || familyTouched[`${r.key}-${f}`]) ? familyErrors[r.key]?.[f] : undefined;
  const touchFamily = (r: FamilyRow, f: FamilyField) => () => {
    if (submitPressRef.current) return;
    setFamilyTouched(t => (t[`${r.key}-${f}`] ? t : { ...t, [`${r.key}-${f}`]: true }));
  };
  const updateFamily = (key: number, patch: Partial<FamilyRow>) =>
    setFamily(rows => rows.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const payErrors = useMemo(() => {
    const e: Partial<Record<PayKey, string>> = {};
    if (method === 'ONLINE') {
      const err = cardError(card.number, card.expiry, card.cvc);
      if (err) e.card = err;
    }
    if (!acceptTerms) e.terms = 'Please accept the terms to continue';
    return e;
  }, [method, card, acceptTerms]);

  const detailError = (k: DetailKey) => ((detailsAttempted || touched[k]) ? detailErrors[k] : undefined);
  const payError = (k: PayKey) => ((payAttempted || touched[k]) ? payErrors[k] : undefined);

  const continueToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setDetailsAttempted(true);
    const firstInvalid = (Object.keys(DETAIL_IDS) as DetailKey[]).find(k => detailErrors[k]);
    const focus = (id: string) => {
      const el = document.getElementById(id);
      el?.focus();
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    if (firstInvalid) { focus(DETAIL_IDS[firstInvalid]); return; }
    const badRow = familyRows.find(r => familyErrors[r.key]);
    if (badRow) {
      const field = (['name', 'relationship', 'gender', 'dob', 'email'] as FamilyField[]).find(f => familyErrors[badRow.key]?.[f])!;
      focus(`jn-fm-${badRow.key}-${field}`);
      return;
    }
    if (householdError) { focus('jn-household'); return; }
    goTo('payment');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!page || !plan || submitting) return;
    setPayAttempted(true);
    setError(null);
    if (payErrors.card) { document.getElementById('jn-card')?.focus(); return; }
    if (payErrors.terms) { document.getElementById('jn-terms')?.focus(); return; }

    const exp = parseExpiry(card.expiry);
    setSubmitting(true);
    try {
      const result = await servicePortfolioService.apply(tenantSlug, branchId, token, {
        full_name: details.fullName.trim(),
        phone: toInternational(phoneCountry, details.phone),
        email: details.email.trim(),
        gender: details.gender,
        date_of_birth: details.dob,
        address: details.address.trim() || undefined,
        emergency_contact_name: details.ecName.trim() || undefined,
        emergency_contact_phone: details.ecPhone.trim() || undefined,
        notes: details.notes.trim() || undefined,
        plan_id: plan.id,
        payment_method: method,
        card: method === 'ONLINE' && exp ? {
          number: cardDigits(card.number),
          exp_month: exp.month,
          exp_year: exp.year,
          cvc: card.cvc,
          name_on_card: card.name.trim() || undefined,
        } : undefined,
        accept_terms: acceptTerms,
        family_members: familyRows.length ? familyRows.map((r): ApplicationFamilyMember => {
          const child = isChild(r);
          return {
            name: r.name.trim(),
            relationship: r.relationship,
            gender: rowGender(r),
            date_of_birth: r.dob || null,
            minor: child,
            phone: child ? null : r.phone.trim() || null,
            email: child ? null : r.email.trim() || null,
          };
        }) : undefined,
      });
      setReceipt(result);
      goTo('done');
    } catch (err) {
      const status = (err as any)?.response?.status;
      setError(status === 429
        ? 'Too many attempts. Please wait a few minutes and try again.'
        : apiErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Phone field handlers ──
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const atEnd = el.selectionStart === el.value.length;
    const parsed = parsePhoneInput(el.value, phoneCountry, atEnd);
    setPhoneCountry(parsed.country);
    setDetails(v => ({ ...v, phone: parsed.value }));
  };
  const handlePhoneBlur = () => {
    if (!details.phone.startsWith('+')) {
      setDetails(v => ({ ...v, phone: formatNational(nationalDigits(v.phone), phoneCountry.groups) }));
    }
    touch('phone')();
  };
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = findDialCountry(e.target.value);
    setPhoneCountry(country);
    setDetails(v => ({ ...v, phone: parsePhoneInput(nationalDigits(v.phone), country).value }));
  };

  // ── Layout shells ──
  const shell = (children: React.ReactNode, narrow = false) => (
    <div className={`${s.page} ${j.page}`} ref={setPageEl}>
      <div className={s.backdrop} aria-hidden="true" />
      {/* Slow-drifting colour behind the glass panels (static when reduced motion is preferred). */}
      <div className={j.aurora} aria-hidden="true"><span /><span /><span /><span /><span /></div>
      <main className={`${s.shell} ${narrow ? s.shellNarrow : j.wide}`}>{children}</main>
    </div>
  );

  if (loadState === 'loading') {
    return shell(
      <div className={s.loader} role="status" aria-label="Loading"><Loader2 className={s.spin} /></div>,
      true,
    );
  }

  if (loadState === 'missing' || !page) {
    return shell(
      <section className={`${s.card} ${s.status}`}>
        <div className={s.statusIcon}><AlertCircle aria-hidden="true" /></div>
        <h1 className={s.statusTitle}>This link isn't available</h1>
        <p className={s.statusText}>It may have been replaced with a new one. Please ask the gym for an up-to-date link.</p>
      </section>,
      true,
    );
  }

  const gymLine = [page.gym_name, page.branch_name].filter(Boolean).join(' · ');

  // ── Done ──
  if (view === 'done' && receipt) {
    const paid = receipt.payment_status === 'PAID';
    return shell(
      <section className={`${s.card} ${s.status}`} role="status">
        <div className={`${s.statusIcon} ${s.statusIconSuccess}`}><CheckCircle2 aria-hidden="true" /></div>
        <h1 className={s.statusTitle}>{paid ? 'Payment successful' : 'Application received'}</h1>
        <p className={s.statusText}>{receipt.message}</p>
        <div className={j.pills}>
          <span className={`${j.pill} ${paid ? j.pillGood : j.pillWait}`}>Payment: {paid ? 'Paid' : 'Pending — pay at the gym'}</span>
          <span className={`${j.pill} ${j.pillWait}`}>Membership: Awaiting approval</span>
        </div>
        <div className={w.ticket}>
          <TicketRow label="Reference" value={receipt.reference} strong />
          <TicketRow label="Name" value={details.fullName.trim()} />
          <TicketRow label="Plan" value={receipt.plan_name} />
          <TicketRow label={paid ? 'Paid' : 'To pay at reception'} value={money(receipt.amount)} />
          {paid && receipt.card_last4 && (
            <TicketRow label="Card" value={`${receipt.card_brand ?? 'Card'} •••• ${receipt.card_last4}`} />
          )}
          {paid && receipt.payment_reference && <TicketRow label="Payment ID" value={receipt.payment_reference} mono />}
        </div>
        <p className={s.footnote} style={{ marginTop: 16 }}>
          Keep your reference number. {paid
            ? "We'll let you know when the gym approves your membership."
            : 'Show it at reception when you come in to pay.'}
        </p>
        {page.phone && (
          <p className={s.footnote}>
            <Phone aria-hidden="true" />
            Questions? <a href={`tel:${page.phone}`}>{page.phone}</a>
          </p>
        )}
      </section>,
      true,
    );
  }

  // ── Details ──
  if (view === 'details' && plan) {
    const nameError = detailError('fullName');
    const phoneError = detailError('phone');
    const emailError = detailError('email');
    const genderError = detailError('gender');
    const dobError = detailError('dob');
    const ecPhoneError = detailError('ecPhone');
    return shell(
      <section className={`${s.card} ${j.glassCard}`} aria-labelledby="jn-details-title">
        <Steps current={1} />
        <div className={j.backRow}>
          <button type="button" className={j.linkButton} onClick={() => goTo('browse')}>
            <ArrowLeft size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> Back to plans
          </button>
        </div>
        <PlanSummary plan={plan} money={money} amount={amountDue} people={1 + familyRows.length} onChange={() => goTo('browse')} />
        <h1 id="jn-details-title" className={s.title} style={{ fontSize: 22 }}>Your details</h1>
        <p className={s.subtitle}>We use these to set up your membership.</p>

        <form onSubmit={continueToPayment} noValidate>
          <div className={s.section}>
            <div className={s.grid}>
              <Field id="jn-name" label="Full name" required error={nameError} full>
                <Input id="jn-name" className={s.control} autoComplete="name" autoCapitalize="words"
                  value={details.fullName} onChange={setDetail('fullName')} onBlur={touch('fullName')}
                  placeholder="e.g. Sara Ahmed" aria-required="true" aria-invalid={!!nameError || undefined}
                  aria-describedby={nameError ? 'jn-name-error' : undefined} />
              </Field>

              <Field id="jn-phone" label="Phone number" required error={phoneError} full>
                <div className={`${s.control} ${s.phone}`} data-invalid={!!phoneError || undefined}>
                  <div className={s.dial}>
                    <span className={s.flag} aria-hidden="true">{phoneCountry.flag}</span>
                    <span aria-hidden="true">+{phoneCountry.dial}</span>
                    <ChevronDown aria-hidden="true" />
                    <select className={s.dialSelect} value={phoneCountry.iso} onChange={handleCountryChange}
                      aria-label={`Country code, ${phoneCountry.name} +${phoneCountry.dial}`}>
                      {DIAL_COUNTRIES.map(c => <option key={c.iso} value={c.iso}>{c.name} (+{c.dial})</option>)}
                    </select>
                  </div>
                  <input id="jn-phone" className={s.phoneInput} type="tel" inputMode="tel" autoComplete="tel"
                    value={details.phone} onChange={handlePhoneChange} onBlur={handlePhoneBlur}
                    placeholder={phoneCountry.placeholder} aria-required="true" aria-invalid={!!phoneError || undefined}
                    aria-describedby={phoneError ? 'jn-phone-error' : undefined} />
                </div>
              </Field>

              <Field id="jn-email" label="Email" required error={emailError} full>
                <Input id="jn-email" className={s.control} type="email" inputMode="email" autoComplete="email"
                  autoCapitalize="off" spellCheck={false} value={details.email} onChange={setDetail('email')}
                  onBlur={touch('email')} placeholder="you@example.com" aria-required="true"
                  aria-invalid={!!emailError || undefined} aria-describedby={emailError ? 'jn-email-error' : undefined} />
              </Field>

              <Field id="jn-gender" label="Gender" required error={genderError}>
                <select id="jn-gender" className={`${s.control} ${j.select}`} value={details.gender}
                  onChange={setDetail('gender')} onBlur={touch('gender')} aria-required="true"
                  aria-invalid={!!genderError || undefined} aria-describedby={genderError ? 'jn-gender-error' : undefined}>
                  <option value="">Select…</option>
                  {genderOptions.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>

              <Field id="jn-dob" label="Date of birth" required error={dobError}>
                <Input id="jn-dob" className={s.control} type="date" autoComplete="bday"
                  max={new Date().toISOString().slice(0, 10)} value={details.dob} onChange={setDetail('dob')}
                  onBlur={touch('dob')} aria-required="true" aria-invalid={!!dobError || undefined}
                  aria-describedby={dobError ? 'jn-dob-error' : undefined} />
              </Field>

              <Field id="jn-address" label="Address" optional full>
                <Input id="jn-address" className={s.control} autoComplete="street-address" value={details.address}
                  onChange={setDetail('address')} placeholder="Building, street, area" />
              </Field>
            </div>
          </div>

          {household && (
            <div className={s.section}>
              <h2 className={s.sectionTitle}>{household.kind === 'couple' ? 'Your partner' : 'Your family'}</h2>
              <p className={j.householdIntro}>
                {household.kind === 'couple'
                  ? 'You are the main member. Add the partner joining you — you pay for both of you together.'
                  : 'You are the main member. Add everyone joining with you — you pay for the whole family together.'}
                {household.kind === 'family' && (household.max_members || household.max_adults || household.max_children)
                  ? ` ${householdLine(plan)}.` : ''}
                {branchGender && (
                  <> <strong>{page.branch_name || 'This branch'} is for {branchGender === 'Female' ? 'women' : 'men'} only</strong>, so
                    everyone joining needs to be {branchGender.toLowerCase()}.</>
                )}
              </p>
              <div className={j.familyList}>
                {familyRows.map((r, i) => {
                  const id = (f: string) => `jn-fm-${r.key}-${f}`;
                  const err = (f: FamilyField) => familyError(r, f);
                  const child = isChild(r);
                  const implied = RELATIONSHIPS.find(x => x.value === r.relationship)?.gender ?? null;
                  const options = RELATIONSHIPS
                    .filter(x => household.kind !== 'couple' || COUPLE_RELATIONSHIPS.includes(x.value))
                    .filter(x => x.gender === null || genderAllowed(access, x.gender));
                  return (
                    <fieldset key={r.key} className={j.familyCard}>
                      <legend className={j.familyLegend}>
                        {household.kind === 'couple' ? 'Partner' : `Family member ${i + 1}`}
                      </legend>
                      {household.kind === 'family' && familyRows.length > 1 && (
                        <button type="button" className={j.familyRemove} onClick={() => setFamily(rows => rows.filter(x => x.key !== r.key))}
                          aria-label={`Remove ${r.name.trim() || `family member ${i + 1}`}`}>
                          <Trash2 aria-hidden="true" />
                        </button>
                      )}
                      <div className={s.grid}>
                        <Field id={id('name')} label="Full name" required error={err('name')} full>
                          <Input id={id('name')} className={s.control} autoComplete="off" autoCapitalize="words"
                            value={r.name} onChange={e => updateFamily(r.key, { name: e.target.value })} onBlur={touchFamily(r, 'name')}
                            aria-required="true" aria-invalid={!!err('name') || undefined}
                            aria-describedby={err('name') ? `${id('name')}-error` : undefined} />
                        </Field>
                        <Field id={id('relationship')} label="Relationship to you" required error={err('relationship')}>
                          <select id={id('relationship')} className={`${s.control} ${j.select}`} value={r.relationship}
                            // A relationship that implies a gender sets it (rowGender); "Other" asks for it,
                            // unless the branch only takes one gender.
                            onChange={e => updateFamily(r.key, { relationship: e.target.value, gender: branchGender })}
                            onBlur={touchFamily(r, 'relationship')} aria-required="true"
                            aria-invalid={!!err('relationship') || undefined}
                            aria-describedby={err('relationship') ? `${id('relationship')}-error` : undefined}>
                            <option value="">Select…</option>
                            {options.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
                          </select>
                        </Field>
                        {r.relationship && !implied && !branchGender && (
                          <Field id={id('gender')} label="Gender" required error={err('gender')}>
                            <select id={id('gender')} className={`${s.control} ${j.select}`} value={r.gender}
                              onChange={e => updateFamily(r.key, { gender: e.target.value })} onBlur={touchFamily(r, 'gender')}
                              aria-required="true" aria-invalid={!!err('gender') || undefined}
                              aria-describedby={err('gender') ? `${id('gender')}-error` : undefined}>
                              <option value="">Select…</option>
                              {genderOptions.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </Field>
                        )}
                        <Field id={id('dob')} label="Date of birth" optional error={err('dob')}>
                          <Input id={id('dob')} className={s.control} type="date" max={new Date().toISOString().slice(0, 10)}
                            value={r.dob} onChange={e => updateFamily(r.key, { dob: e.target.value })} onBlur={touchFamily(r, 'dob')}
                            aria-invalid={!!err('dob') || undefined} aria-describedby={err('dob') ? `${id('dob')}-error` : undefined} />
                        </Field>
                        {household.kind === 'family' && !r.dob && (
                          <label className={j.childToggle} htmlFor={id('child')} style={{ gridColumn: '1 / -1' }}>
                            <Checkbox id={id('child')} className={s.checkbox} checked={r.child}
                              onCheckedChange={v => updateFamily(r.key, { child: v === true })} />
                            <span>Under 18</span>
                          </label>
                        )}
                        {!child && (
                          <>
                            <Field id={id('phone')} label="Phone" optional>
                              <Input id={id('phone')} className={s.control} type="tel" inputMode="tel" autoComplete="off"
                                value={r.phone} onChange={e => updateFamily(r.key, { phone: e.target.value })} placeholder="+971 50 123 4567" />
                            </Field>
                            <Field id={id('email')} label="Email" optional error={err('email')}>
                              <Input id={id('email')} className={s.control} type="email" inputMode="email" autoComplete="off"
                                autoCapitalize="off" spellCheck={false} value={r.email}
                                onChange={e => updateFamily(r.key, { email: e.target.value })} onBlur={touchFamily(r, 'email')}
                                aria-invalid={!!err('email') || undefined} aria-describedby={err('email') ? `${id('email')}-error` : undefined} />
                            </Field>
                          </>
                        )}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
              {household.kind === 'family' && familyRows.length < MAX_FAMILY_ROWS && (
                <button type="button" className={j.familyAdd} onClick={() => setFamily(rows => [...rows, newFamilyRow()])}>
                  <Plus aria-hidden="true" />Add family member
                </button>
              )}
              <div id="jn-household" tabIndex={-1} className={j.householdTotal}>
                <span>
                  {1 + familyRows.length} {familyRows.length === 0 ? 'person' : 'people'} including you
                  {household.price_per_member ? ` · ${money(household.price_per_member)} per person` : ''}
                </span>
                <strong>{money(amountDue)}</strong>
              </div>
              {householdError && (
                <FieldError id="jn-household-error" message={householdError} style={{ marginTop: 8 }} />
              )}
            </div>
          )}

          <div className={s.section}>
            <h2 className={s.sectionTitle}>Emergency contact <span className={s.optional}>(optional)</span></h2>
            <div className={s.grid}>
              <Field id="jn-ec-name" label="Name">
                <Input id="jn-ec-name" className={s.control} autoComplete="off" value={details.ecName}
                  onChange={setDetail('ecName')} placeholder="Who should we call?" />
              </Field>
              <Field id="jn-ec-phone" label="Phone" error={ecPhoneError}>
                <Input id="jn-ec-phone" className={s.control} type="tel" inputMode="tel" autoComplete="off"
                  value={details.ecPhone} onChange={setDetail('ecPhone')} onBlur={touch('ecPhone')}
                  placeholder="+971 50 123 4567" aria-invalid={!!ecPhoneError || undefined}
                  aria-describedby={ecPhoneError ? 'jn-ec-phone-error' : undefined} />
              </Field>
              <Field id="jn-notes" label="Health notes or goals" optional full>
                <Textarea id="jn-notes" className={`${s.control} ${s.textarea}`} rows={3} value={details.notes}
                  onChange={setDetail('notes')} placeholder="Anything the trainers should know" />
              </Field>
            </div>
          </div>

          <div className={s.actions}>
            <Button type="submit" className={s.submit} onPointerDown={handlePressStart}>
              Continue to payment<ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </form>
      </section>,
      true,
    );
  }

  // ── Payment ──
  if (view === 'payment' && plan) {
    const digits = cardDigits(card.number);
    const brand = cardBrand(digits);
    const cardErr = payError('card');
    const termsErr = payError('terms');
    return shell(
      <section className={`${s.card} ${j.glassCard}`} aria-labelledby="jn-pay-title">
        <Steps current={2} />
        <div className={j.backRow}>
          <button type="button" className={j.linkButton} onClick={() => goTo('details')}>
            <ArrowLeft size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> Back to your details
          </button>
        </div>
        <PlanSummary plan={plan} money={money} amount={amountDue} people={1 + familyRows.length} />
        <h1 id="jn-pay-title" className={s.title} style={{ fontSize: 22 }}>How would you like to pay?</h1>
        <p className={s.subtitle}>Your membership starts once the gym approves your application.</p>

        <form onSubmit={submit} noValidate aria-busy={submitting}>
          <div className={j.methods} role="radiogroup" aria-label="Payment method">
            {page.online_payment_enabled && (
              <label className={j.method}>
                <input type="radio" name="jn-method" checked={method === 'ONLINE'} onChange={() => setMethod('ONLINE')} />
                <span className={j.methodIcon}><CreditCard aria-hidden="true" /></span>
                <span>
                  <span className={j.methodTitle}>Pay online</span>
                  <span className={j.methodText}>Card payment now — {money(amountDue)}</span>
                </span>
              </label>
            )}
            <label className={j.method}>
              <input type="radio" name="jn-method" checked={method === 'CASH'} onChange={() => setMethod('CASH')} />
              <span className={j.methodIcon}><Banknote aria-hidden="true" /></span>
              <span>
                <span className={j.methodTitle}>Pay cash at the gym</span>
                <span className={j.methodText}>Apply now, pay at reception</span>
              </span>
            </label>
          </div>

          {method === 'ONLINE' ? (
            <div className={j.checkout}>
              <div className={j.checkoutHead}>
                <span>Card details</span>
                <span className={j.secure}><Lock aria-hidden="true" />Test mode</span>
              </div>
              <div className={j.cardBox} data-invalid={!!cardErr || undefined}>
                <div className={j.cardRow}>
                  <input id="jn-card" className={j.cardInput} inputMode="numeric" autoComplete="cc-number"
                    placeholder="1234 1234 1234 1234" value={formatCardNumber(digits)}
                    onChange={e => setCard(c => ({ ...c, number: cardDigits(e.target.value) }))}
                    onBlur={touch('card')} aria-label="Card number" aria-invalid={!!cardErr || undefined}
                    aria-describedby={cardErr ? 'jn-card-error' : undefined} />
                  {brand && <span className={j.brand}>{brand}</span>}
                </div>
                <div className={j.cardRow}>
                  <input className={j.cardInput} inputMode="numeric" autoComplete="cc-exp" placeholder="MM / YY"
                    value={card.expiry} onChange={e => setCard(c => ({ ...c, expiry: formatExpiry(e.target.value, c.expiry) }))}
                    onBlur={touch('card')} aria-label="Expiration date (MM / YY)" />
                  <input className={j.cardInput} inputMode="numeric" autoComplete="cc-csc" placeholder="CVC"
                    value={card.cvc} onChange={e => setCard(c => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    onBlur={touch('card')} aria-label="Security code (CVC)" />
                </div>
                <div className={j.cardRow}>
                  <input className={j.cardInput} autoComplete="cc-name" placeholder="Name on card" value={card.name}
                    onChange={e => setCard(c => ({ ...c, name: e.target.value }))} aria-label="Name on card" />
                </div>
              </div>
              {cardErr && <FieldError id="jn-card-error" message={cardErr} style={{ marginTop: 8 }} />}
              <div className={j.testNote}>
                This is a demo checkout — no real money is taken. Use test card{' '}
                <button type="button" onClick={() => setCard(c => ({ ...c, number: cardDigits(TEST_CARD), expiry: c.expiry || '12 / 34', cvc: c.cvc || '123' }))}>
                  {TEST_CARD}
                </button>{' '}
                with any future date and any CVC. 4000 0000 0000 0002 shows a declined card.
              </div>
            </div>
          ) : (
            <div className={j.cashNote}>
              Your application is sent to the gym now with payment <strong>pending</strong>. Visit reception and pay{' '}
              <strong>{money(amountDue)}</strong> in cash — staff will confirm it and activate your membership.
            </div>
          )}

          <div className={s.section} style={{ marginTop: 18 }}>
            <label htmlFor="jn-terms" className={s.consent} data-invalid={!!termsErr || undefined}>
              <Checkbox id="jn-terms" className={s.checkbox} checked={acceptTerms}
                onCheckedChange={v => { setAcceptTerms(v === true); touch('terms')(); }} aria-required="true"
                aria-invalid={!!termsErr || undefined} aria-describedby={termsErr ? 'jn-terms-error' : undefined} />
              <span>
                I confirm my details are correct and I agree to {page.gym_name || 'the gym'}'s membership terms
                {page.terms_and_policies ? ' (see Terms & policies on the plans page)' : ''}. I understand the
                membership starts only after the gym approves it.
              </span>
            </label>
            {termsErr && <FieldError id="jn-terms-error" message={termsErr} style={{ marginTop: 8 }} />}
          </div>

          {error && (
            <div className={s.formAlert} role="alert">
              <AlertCircle aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className={s.actions}>
            <Button type="submit" className={s.submit} disabled={submitting} onPointerDown={handlePressStart}>
              {submitting
                ? <><Loader2 className={s.spin} aria-hidden="true" />{method === 'ONLINE' ? 'Processing payment…' : 'Submitting…'}</>
                : method === 'ONLINE'
                  ? <><Lock aria-hidden="true" />Pay {money(amountDue)}</>
                  : <>Submit application<ArrowRight aria-hidden="true" /></>}
            </Button>
          </div>
        </form>
      </section>,
      true,
    );
  }

  // ── Browse ──
  const sections: { id: string; label: string; show: boolean }[] = [
    { id: 'plans', label: 'Membership plans', show: true },
    { id: 'classes', label: 'Group classes', show: page.classes.length > 0 },
    { id: 'programs', label: 'Training programs', show: page.programs.length > 0 },
    { id: 'streams', label: 'Training streams', show: page.streams.length > 0 },
    { id: 'facilities', label: 'Facilities', show: page.facilities.length > 0 },
    { id: 'trainers', label: 'Trainers', show: page.trainers.length > 0 },
    { id: 'about', label: 'About & timings', show: !!(page.about || page.operating_hours || page.terms_and_policies || page.gallery_image_urls.length > 1) },
  ];
  const visible = sections.filter(x => x.show);
  const active = visible.some(x => x.id === tab) ? tab : 'plans';
  // Only offer filters for categories that actually have plans; no row at all if there's just one.
  const planCounts = PLAN_CATEGORIES
    .map(c => ({ ...c, count: page.plans.filter(p => planCategory(p) === c.id).length }))
    .filter(c => c.count > 0);
  const showPlanFilter = planCounts.length > 1;
  const shownPlans = showPlanFilter && planFilter !== 'all'
    ? page.plans.filter(p => planCategory(p) === planFilter)
    : page.plans;
  const selectTab = (id: string) => {
    if (id === active) return;
    const from = visible.findIndex(x => x.id === active);
    setTabDir(visible.findIndex(x => x.id === id) > from ? 1 : -1);
    setTab(id);
    // Keep the tab bar in view when switching from further down the page.
    const nav = document.getElementById('jn-tabs');
    if (nav && nav.getBoundingClientRect().top < 0) nav.scrollIntoView({ block: 'start' });
  };

  return shell(
    <>
      <header className={j.hero}>
        {page.cover_image_url && <img className={j.heroImage} src={resolveBackendImageUrl(page.cover_image_url)} alt="" />}
        <div className={j.heroShade} aria-hidden="true" />
        <div className={j.heroBody}>
          <div className={j.heroEyebrow}><Dumbbell size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />Plans & membership</div>
          <h1 className={j.heroTitle}>{gymLine || 'Our gym'}</h1>
          <div className={j.heroMeta}>
            {page.address && <span><MapPin aria-hidden="true" />{page.address}</span>}
            {page.phone && <a href={`tel:${page.phone}`}><Phone aria-hidden="true" />{page.phone}</a>}
            {page.email && <a href={`mailto:${page.email}`}><Mail aria-hidden="true" />{page.email}</a>}
          </div>
        </div>
      </header>

      {visible.length > 1 && (
        <nav id="jn-tabs" className={j.nav} aria-label="Sections">
          <div className={j.navInner} role="tablist" ref={navRef} data-pill={pill ? '' : undefined}
            data-fade-left={navFade.left ? '' : undefined} data-fade-right={navFade.right ? '' : undefined}>
          {pill && (
            <span className={j.navPill} aria-hidden="true"
              style={{ width: pill.width, transform: `translateX(${pill.left}px)` }} />
          )}
          {visible.map(x => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={active === x.id}
              aria-controls={`jn-sec-${x.id}`}
              className={`${j.navChip} ${active === x.id ? j.navChipActive : ''}`}
              onClick={() => selectTab(x.id)}
            >
              {x.label}
            </button>
          ))}
          </div>
        </nav>
      )}

      {/* Keyed by tab so its content re-enters with the slide/fade each switch. */}
      <div key={active} className={j.tabPanel} data-dir={tabDir}>
      {active === 'plans' && (
      <section id="jn-sec-plans" className={j.block} aria-labelledby="jn-plans-title">
        <h2 id="jn-plans-title" className={j.blockTitle}>Membership plans</h2>
        <p className={j.blockSub}>Pick a plan to apply — pay online now or in cash at the gym.</p>
        {showPlanFilter && (
          <div className={j.filters} role="group" aria-label="Filter plans by type">
            {[{ id: 'all' as const, label: 'All', count: page.plans.length }, ...planCounts].map(c => (
              <button
                key={c.id}
                type="button"
                aria-pressed={planFilter === c.id}
                className={`${j.filterChip} ${planFilter === c.id ? j.filterChipActive : ''}`}
                onClick={() => setPlanFilter(c.id)}
              >
                {c.label}<span className={j.filterCount}>{c.count}</span>
              </button>
            ))}
          </div>
        )}
        {page.plans.length === 0 ? (
          <div className={j.empty}>No plans are open for online sign-up right now. Please contact the gym.</div>
        ) : (
          <div key={planFilter} className={`${j.grid} ${j.grid3}`}>
            {shownPlans.map(p => {
              // Colour follows the plan's place in the full list, so it doesn't change when filtering.
              const tone = page.plans.indexOf(p) % TONES;
              const offer = p.effective_price < p.price;
              return (
                <article key={p.id} className={`${j.tile} ${j.plan}`} data-tone={tone}>
                  <div className={j.planHead}>
                    <div>
                      <h3 className={j.planName}>{p.name}</h3>
                      {p.duration && <span className={j.planDuration}>{p.duration}</span>}
                    </div>
                    {offer && <span className={j.badge}>{p.offer_label || 'Offer'}</span>}
                  </div>
                  {p.household?.price_per_member ? (
                    <div>
                      <span className={j.price}>{money(p.household.price_per_member)}</span>
                      <span className={j.priceUnit}> per person</span>
                    </div>
                  ) : (
                    <div>
                      <span className={j.price}>{money(p.effective_price)}</span>
                      {offer && <span className={j.wasPrice}>{money(p.price)}</span>}
                      {p.household && <span className={j.priceUnit}> {p.household.kind === 'couple' ? 'for both' : 'for the family'}</span>}
                    </div>
                  )}
                  {p.household && <div className={j.householdBadge}><Users aria-hidden="true" />{householdLine(p)}</div>}
                  {p.description && <p className={j.prose} style={{ margin: 0 }}>{p.description}</p>}
                  <ul className={j.features}>
                    {p.features.map((f, i) => <li key={i}><CheckCircle aria-hidden="true" />{f}</li>)}
                  </ul>
                  <div className={j.planActions}>
                    {p.joinable ? (
                      <Button className={s.submit} style={{ width: '100%' }} onClick={() => choosePlan(p)}>
                        Join with this plan<ArrowRight aria-hidden="true" />
                      </Button>
                    ) : (
                      <span className={j.planNote}>This plan is set up at reception — contact the gym to join.</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      )}

      {active === 'classes' && page.classes.length > 0 && (
        <SessionBlock id="classes" title="Group classes" sub="Upcoming classes over the next few weeks" sessions={page.classes} money={money} />
      )}

      {active === 'programs' && page.programs.length > 0 && (
        <SessionBlock id="programs" title="Training programs" sub="Personal training sessions with our trainers" sessions={page.programs} money={money} />
      )}

      {active === 'streams' && page.streams.length > 0 && (
        <section id="jn-sec-streams" className={j.block} aria-labelledby="jn-streams-title">
          <h2 id="jn-streams-title" className={j.blockTitle}>Training streams</h2>
          <p className={j.blockSub}>Live and upcoming online sessions led by our trainers — included for members.</p>
          <div className={j.rowList}>
            {page.streams.map((st, i) => (
              <div key={st.id} className={`${j.tile} ${j.row}`} data-tone={i % TONES}>
                <span className={j.facilityIcon}>{st.status === 'Live' ? <Radio aria-hidden="true" /> : <Video aria-hidden="true" />}</span>
                <div className={j.rowBody}>
                  <div className={j.rowTitle}>{st.title}</div>
                  <div className={j.rowMeta}>
                    {st.instructor_name && <span><Users aria-hidden="true" />{st.instructor_name}</span>}
                    {st.category && <span>{st.category}</span>}
                    {st.difficulty && <span>{st.difficulty}</span>}
                    {st.duration ? <span><Clock aria-hidden="true" />{st.duration} min</span> : null}
                    {st.status === 'Scheduled' && st.scheduled_time && (
                      <span><Calendar aria-hidden="true" />{new Date(st.scheduled_time).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </div>
                </div>
                <span className={`${j.rowSide} ${st.status === 'Live' ? j.live : ''}`}>{st.status === 'Live' ? 'Live now' : 'Upcoming'}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {active === 'facilities' && page.facilities.length > 0 && (
        <section id="jn-sec-facilities" className={j.block} aria-labelledby="jn-fac-title">
          <h2 id="jn-fac-title" className={j.blockTitle}>Facilities</h2>
          <p className={j.blockSub}>What's available at this branch</p>
          <div className={`${j.grid} ${j.grid3}`}>
            {page.facilities.map((f, i) => (
              <div key={f.id} className={`${j.tile} ${j.facility}`} data-tone={i % TONES}>
                <span className={j.facilityIcon}><Sparkles aria-hidden="true" /></span>
                <div className={j.rowBody}>
                  <div className={j.rowTitle}>{f.name}</div>
                  {f.description && <div className={j.rowMeta}>{f.description}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {active === 'trainers' && page.trainers.length > 0 && (
        <section id="jn-sec-trainers" className={j.block} aria-labelledby="jn-tr-title">
          <h2 id="jn-tr-title" className={j.blockTitle}>Our trainers</h2>
          <p className={j.blockSub}>The team you'll train with</p>
          <div className={`${j.grid} ${j.grid3}`}>
            {page.trainers.map((t, i) => (
              <button
                key={t.id}
                type="button"
                className={`${j.tile} ${j.facility} ${j.trainerCard}`}
                data-tone={i % TONES}
                onClick={() => setOpenTrainer(t)}
                aria-label={`View ${t.name}'s profile`}
              >
                <span className={j.avatar}>
                  {t.photo_url ? <img src={resolveBackendImageUrl(t.photo_url)} alt="" /> : (t.name || '?').charAt(0).toUpperCase()}
                </span>
                <div className={j.rowBody}>
                  <div className={j.rowTitle}>{t.name}</div>
                  <div className={j.rowMeta}>
                    {t.role && <span>{t.role}</span>}
                    {t.rating_count > 0 && t.average_rating != null && (
                      <span><Star aria-hidden="true" />{t.average_rating.toFixed(1)} ({t.rating_count})</span>
                    )}
                  </div>
                </div>
                <ChevronRight className={j.trainerChevron} aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}

      <TrainerProfile
        trainer={openTrainer}
        sessions={openTrainer
          ? [...page.classes, ...page.programs]
              .filter(se => se.trainer_id === openTrainer.id)
              .sort((a, b) => `${a.date ?? ''}${a.start_time ?? ''}`.localeCompare(`${b.date ?? ''}${b.start_time ?? ''}`))
          : []}
        container={pageEl}
        onClose={() => setOpenTrainer(null)}
      />

      {active === 'about' && sections.find(x => x.id === 'about')?.show && (
        <section id="jn-sec-about" className={j.block} aria-labelledby="jn-about-title">
          <h2 id="jn-about-title" className={j.blockTitle}>About & timings</h2>
          <div className={j.grid}>
            {page.about && (
              <div className={j.tile}>
                <h3 className={j.planName} style={{ marginBottom: 6 }}><Award size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />About us</h3>
                <div className={j.prose}>{page.about}</div>
              </div>
            )}
            {page.operating_hours && (
              <div className={j.tile}>
                <h3 className={j.planName} style={{ marginBottom: 6 }}><Clock size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />Timings</h3>
                <div className={j.prose}>{page.operating_hours}</div>
              </div>
            )}
          </div>
          {page.gallery_image_urls.length > 1 && (
            <div className={j.gallery} style={{ marginTop: 14 }}>
              {page.gallery_image_urls.map((url, i) => <img key={i} src={resolveBackendImageUrl(url)} alt="" loading="lazy" />)}
            </div>
          )}
          {page.terms_and_policies && (
            <div className={j.tile} style={{ marginTop: 14 }}>
              <h3 className={j.planName} style={{ marginBottom: 6 }}>Terms & policies</h3>
              <div className={j.prose}>{page.terms_and_policies}</div>
            </div>
          )}
        </section>
      )}

      </div>

      <p className={j.footer}>Membership applications are reviewed by {page.gym_name || 'the gym'} before they start.</p>
    </>,
  );
}

// ── Small pieces ─────────────────────────────────────────────────────────────

function TicketRow({ label, value, strong, mono }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  return (
    <div className={w.ticketRow}>
      <span>{label}</span>
      <span style={{ fontWeight: strong ? 800 : undefined, overflowWrap: 'anywhere', fontFamily: mono ? 'ui-monospace, monospace' : undefined, fontSize: mono ? 12 : undefined }}>{value}</span>
    </div>
  );
}

function Steps({ current }: { current: 1 | 2 }) {
  return (
    <div className={j.steps} aria-label={`Step ${current} of 2`}>
      <span className={j.step} data-active={current === 1} data-done={current > 1}>1. Your details</span>
      <span className={j.step} data-active={current === 2}>2. Payment</span>
    </div>
  );
}

function PlanSummary({ plan, money, amount, people, onChange }: {
  plan: PortfolioPlan; money: (n: number) => string; amount: number; people: number; onChange?: () => void;
}) {
  return (
    <div className={j.summary}>
      <div>
        <strong>{plan.name}</strong>
        <span>
          {plan.duration}{plan.household ? ` · ${people} ${people === 1 ? 'person' : 'people'}` : ''}
          {onChange && <> · <button type="button" className={j.linkButton} onClick={onChange}>Change plan</button></>}
        </span>
      </div>
      <div className={j.summaryPrice}>{money(amount)}</div>
    </div>
  );
}

const MAX_PROFILE_SESSIONS = 5;

function sinceLabel(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** A trainer's public profile — opened from a trainer card on the Trainers tab. */
function TrainerProfile({ trainer, sessions, container, onClose }: {
  trainer: PortfolioTrainer | null;
  sessions: PortfolioSession[];
  container: HTMLElement | null;
  onClose: () => void;
}) {
  // Keep the last trainer while the panel animates closed.
  const [shown, setShown] = useState<PortfolioTrainer | null>(trainer);
  useEffect(() => { if (trainer) setShown(trainer); }, [trainer]);
  const t = trainer ?? shown;

  const dist = t?.rating_distribution?.length === 5 ? t.rating_distribution : [0, 0, 0, 0, 0];
  const maxBar = Math.max(1, ...dist);
  const rated = !!t && t.rating_count > 0 && t.average_rating != null;
  const since = sinceLabel(t?.join_date);
  const certs = t?.certifications ?? [];
  const tags = t?.top_tags ?? [];

  return (
    <DialogPrimitive.Root open={!!trainer} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal container={container ?? undefined}>
        <DialogPrimitive.Overlay className={j.profileOverlay} />
        <DialogPrimitive.Content className={j.profilePanel} aria-describedby={undefined}>
          {t && (
            <>
              <DialogPrimitive.Close className={j.profileClose} aria-label="Close">
                <X aria-hidden="true" />
              </DialogPrimitive.Close>

              <div className={j.profileHead}>
                <span className={`${j.avatar} ${j.profileAvatar}`}>
                  {t.photo_url ? <img src={resolveBackendImageUrl(t.photo_url)} alt="" /> : (t.name || '?').charAt(0).toUpperCase()}
                </span>
                <div style={{ minWidth: 0 }}>
                  <DialogPrimitive.Title className={j.profileName}>{t.name}</DialogPrimitive.Title>
                  <div className={j.rowMeta}>
                    {t.role && <span>{t.role}</span>}
                    {since && <span><Calendar aria-hidden="true" />With us since {since}</span>}
                  </div>
                </div>
              </div>

              <div className={j.profileSection}>
                <h3 className={j.profileLabel}>Member ratings</h3>
                {rated ? (
                  <div className={j.ratingWrap}>
                    <div className={j.ratingScore}>
                      <strong>{t.average_rating!.toFixed(1)}</strong>
                      <span className={j.ratingStars} aria-hidden="true">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star key={n} className={n <= Math.round(t.average_rating!) ? j.starOn : j.starOff} />
                        ))}
                      </span>
                      <span>{t.rating_count} rating{t.rating_count === 1 ? '' : 's'}</span>
                    </div>
                    <ul className={j.ratingBars} aria-label="Ratings by star">
                      {[5, 4, 3, 2, 1].map(star => (
                        <li key={star}>
                          <span className={j.barLabel}>{star}<Star aria-hidden="true" /></span>
                          <span className={j.barTrack}>
                            <span className={j.barFill} style={{ width: `${(dist[star - 1] / maxBar) * 100}%` }} />
                          </span>
                          <span className={j.barCount}>{dist[star - 1]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className={j.profileMuted}>No ratings yet.</p>
                )}
                {tags.length > 0 && (
                  <div className={j.tagRow}>
                    {tags.map(tag => <span key={tag} className={j.tag}>{tag}</span>)}
                  </div>
                )}
              </div>

              {certs.length > 0 && (
                <div className={j.profileSection}>
                  <h3 className={j.profileLabel}>Certifications</h3>
                  <ul className={j.certList}>
                    {certs.map((c, i) => <li key={i}><Award aria-hidden="true" />{c}</li>)}
                  </ul>
                </div>
              )}

              {sessions.length > 0 && (
                <div className={j.profileSection}>
                  <h3 className={j.profileLabel}>Upcoming sessions</h3>
                  <ul className={j.profileSessions}>
                    {sessions.slice(0, MAX_PROFILE_SESSIONS).map(se => {
                      const d = dateParts(se.date);
                      return (
                        <li key={se.id}>
                          <span className={j.dateBox}>
                            {d ? <><span>{d.weekday}</span><strong>{d.day}</strong><span>{d.month}</span></> : <Calendar aria-hidden="true" />}
                          </span>
                          <div className={j.rowBody}>
                            <div className={j.rowTitle}>{se.name}</div>
                            <div className={j.rowMeta}>
                              {(se.start_time || se.end_time) && <span><Clock aria-hidden="true" />{hhmm(se.start_time)}{se.end_time ? `–${hhmm(se.end_time)}` : ''}</span>}
                              {se.location && <span><MapPin aria-hidden="true" />{se.location}</span>}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {sessions.length > MAX_PROFILE_SESSIONS && (
                    <p className={j.profileMuted}>+{sessions.length - MAX_PROFILE_SESSIONS} more upcoming</p>
                  )}
                </div>
              )}
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SessionBlock({ id, title, sub, sessions, money }: {
  id: string; title: string; sub: string; sessions: PortfolioSession[]; money: (n: number) => string;
}) {
  return (
    <section id={`jn-sec-${id}`} className={j.block} aria-labelledby={`jn-${id}-title`}>
      <h2 id={`jn-${id}-title`} className={j.blockTitle}>{title}</h2>
      <p className={j.blockSub}>{sub}</p>
      <div className={j.rowList}>
        {sessions.map((se, i) => {
          const d = dateParts(se.date);
          const full = se.spots_left != null && se.spots_left <= 0;
          return (
            <div key={se.id} className={`${j.tile} ${j.row}`} data-tone={i % TONES}>
              <span className={j.dateBox}>
                {d ? <><span>{d.weekday}</span><strong>{d.day}</strong><span>{d.month}</span></> : <Calendar aria-hidden="true" />}
              </span>
              <div className={j.rowBody}>
                <div className={j.rowTitle}>{se.name}</div>
                <div className={j.rowMeta}>
                  {(se.start_time || se.end_time) && <span><Clock aria-hidden="true" />{hhmm(se.start_time)}{se.end_time ? `–${hhmm(se.end_time)}` : ''}</span>}
                  {se.trainer_name && <span><Users aria-hidden="true" />{se.trainer_name}</span>}
                  {se.location && <span><MapPin aria-hidden="true" />{se.location}</span>}
                </div>
              </div>
              <span className={j.rowSide}>
                {se.price != null && se.price > 0 ? money(se.price) : null}
                {se.spots_left != null && (
                  <span style={{ display: 'block', fontWeight: 500, color: full ? '#c62a37' : '#64748b' }}>
                    {full ? 'Full' : `${se.spots_left} spot${se.spots_left === 1 ? '' : 's'} left`}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Field({ id, label, required, optional, error, full, children }: {
  id: string; label: string; required?: boolean; optional?: boolean; error?: string; full?: boolean; children: React.ReactNode;
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
