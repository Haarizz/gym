import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CheckCircle, AlertCircle, Loader2, Phone } from 'lucide-react';
import { leadFormService, leadFormErrorMessage, type PublicLeadForm } from '../utils/supabase/lead-form-service';

// Public page behind a gym's ad link (/f/{formKey}). Rendered standalone from
// main.tsx — no auth, branch or currency providers — like the legal pages.

const CONTACT_METHODS = [
  { value: 'phone', label: 'Phone call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
];

export function PublicLeadFormPage({ formKey }: { formKey: string }) {
  const [form, setForm] = useState<PublicLeadForm | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [values, setValues] = useState({
    fullName: '', phone: '', email: '', interest: '', preferredContactMethod: 'phone', message: '', website: '',
  });
  const [consent, setConsent] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setError(null);

    if (!values.fullName.trim()) return setError('Please enter your name');
    if (values.phone.replace(/\D/g, '').length < 7) return setError('Please enter a valid phone number');
    if (form.requireEmail && !values.email.trim()) return setError('Please enter your email');
    if (!consent) return setError('Please agree to be contacted so we can get back to you');

    setSubmitting(true);
    try {
      const res = await leadFormService.submitPublic(formKey, {
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
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

  const page = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gray-50" style={{ display: 'flex', justifyContent: 'center', padding: '40px 16px' }}>
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );

  if (loadState === 'loading') {
    return page(
      <div className="text-center text-muted-foreground" style={{ paddingTop: 80 }}>
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
      </div>
    );
  }

  if (loadState === 'missing' || !form) {
    return page(
      <Card>
        <CardContent className="text-center" style={{ padding: 32 }}>
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="font-semibold" style={{ marginTop: 12 }}>This form is no longer available</p>
          <p className="text-sm text-muted-foreground" style={{ marginTop: 4 }}>
            The link may have expired. Please contact the gym directly.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (successMessage) {
    return page(
      <Card>
        <CardContent className="text-center" style={{ padding: 32 }}>
          <div className="bg-green-100 mx-auto" style={{ width: 56, height: 56, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-2xl font-semibold" style={{ marginTop: 16 }}>You're all set!</p>
          <p className="text-muted-foreground" style={{ marginTop: 8, whiteSpace: 'pre-line' }}>{successMessage}</p>
          {form.branchPhone && (
            <p className="text-sm text-muted-foreground" style={{ marginTop: 16 }}>
              Can't wait? Call us at <a href={`tel:${form.branchPhone}`} className="font-semibold">{form.branchPhone}</a>
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return page(
    <Card className="shadow-xl">
      <CardHeader>
        <p className="text-sm font-semibold text-muted-foreground">
          {form.gymName}{form.branchName ? ` · ${form.branchName}` : ''}
        </p>
        <CardTitle className="text-2xl">{form.headline || 'Start your fitness journey'}</CardTitle>
        <CardDescription style={{ whiteSpace: 'pre-line' }}>
          {form.description || 'Leave your details and our team will get in touch with you.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="lf-name">Full name *</Label>
            <Input id="lf-name" autoComplete="name" value={values.fullName} onChange={set('fullName')} placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lf-phone">Phone number *</Label>
            <Input id="lf-phone" type="tel" autoComplete="tel" inputMode="tel" value={values.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
          </div>
          {form.showEmail && (
            <div className="space-y-2">
              <Label htmlFor="lf-email">Email {form.requireEmail ? '*' : <span className="text-muted-foreground">(optional)</span>}</Label>
              <Input id="lf-email" type="email" autoComplete="email" value={values.email} onChange={set('email')} placeholder="you@example.com" />
            </div>
          )}
          {form.showInterest && form.interestOptions && form.interestOptions.length > 0 && (
            <div className="space-y-2">
              <Label>What are you interested in?</Label>
              <Select value={values.interest} onValueChange={v => setValues(s => ({ ...s, interest: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose an option" /></SelectTrigger>
                <SelectContent>
                  {form.interestOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>How should we contact you?</Label>
            <Select value={values.preferredContactMethod} onValueChange={v => setValues(s => ({ ...s, preferredContactMethod: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTACT_METHODS
                  .filter(m => m.value !== 'email' || form.showEmail)
                  .map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lf-message">Message <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="lf-message" value={values.message} onChange={set('message')} placeholder="Your goals, preferred timing, questions…" />
          </div>

          {/* Honeypot: off-screen and skipped by keyboard/autofill, so only bots fill it. */}
          <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
            <label htmlFor="lf-website">Website</label>
            <input id="lf-website" tabIndex={-1} autoComplete="off" value={values.website} onChange={set('website')} />
          </div>

          <label htmlFor="lf-consent" className="text-sm text-muted-foreground" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              id="lf-consent"
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }}
            />
            <span>
              I agree to be contacted by {form.gymName || 'the gym'} by phone, WhatsApp or email about memberships and offers.
              {' '}Read our{' '}
              <a href={form.privacyPolicyUrl || '/privacy-policy'} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
                Privacy Policy
              </a>.
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-500" role="alert">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : 'Submit'}
          </Button>

          {form.branchPhone && (
            <p className="text-xs text-muted-foreground text-center">
              <Phone className="h-3 w-3" style={{ display: 'inline', marginRight: 4 }} />
              Prefer to talk? <a href={`tel:${form.branchPhone}`}>{form.branchPhone}</a>
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
