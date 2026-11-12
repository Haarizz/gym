import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, AtSign, CheckCircle2, FileText, Info, KeyRound, Loader2, Mail, Send, Server, Tag, XCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { SettingsSaveBar } from "./SettingsSaveBar";
import { usePermission } from "../../utils/permissions";
import { useCurrency } from "../../utils/currency";
import { useBranch } from "../../utils/branch-context";
import {
  emailSettingsService, emailSettingsError, EmailSettings as Saved, MailSecurity,
} from "../../utils/supabase/email-settings-service";
import { buildTestInvoicePdf } from "./test-invoice-pdf";
import styles from "./EmailSettings.module.css";

/**
 * GymOS › Settings › Email: the gym's own SMTP mailbox. Gym-wide (all branches). Once saved and
 * switched on, every email GymBios sends for this gym goes out through it — daily face-device
 * and attendance reports, BiOS reports, member codes. The test can attach a sample invoice PDF.
 *
 * Kept to what a gym needs: provider, host/port/security, one email address (used to log in and
 * as the sender), the app password and a sender name.
 */

interface Form {
  enabled: boolean;
  host: string;
  port: string;
  security: MailSecurity;
  email: string;
  password: string;
  senderName: string;
}

type ProviderId = "gmail" | "microsoft" | "hostinger" | "zoho" | "custom";

const PROVIDERS: { id: ProviderId; label: string; host: string; port: number; security: MailSecurity }[] = [
  { id: "gmail", label: "Gmail / Google Workspace", host: "smtp.gmail.com", port: 587, security: "STARTTLS" },
  { id: "microsoft", label: "Microsoft 365 / Outlook", host: "smtp.office365.com", port: 587, security: "STARTTLS" },
  { id: "hostinger", label: "Hostinger", host: "smtp.hostinger.com", port: 465, security: "SSL" },
  { id: "zoho", label: "Zoho Mail", host: "smtp.zoho.com", port: 465, security: "SSL" },
];

/** Step-by-step password help for the chosen provider. */
const PROVIDER_HELP: Record<ProviderId, { title: string; steps: React.ReactNode[] }> = {
  gmail: {
    title: "Gmail App Password",
    steps: [
      <>Open <strong>myaccount.google.com</strong> with the Gmail account you'll send from.</>,
      <>Go to <strong>Security</strong> and turn on <strong>2-Step Verification</strong>.</>,
      <>Search for <strong>App passwords</strong>, create one named “GymBios”.</>,
      <>Copy the 16-character password and paste it into <em>App password</em> here (spaces don't matter).</>,
      <>Save, then send a test email.</>,
    ],
  },
  microsoft: {
    title: "Microsoft 365 / Outlook password",
    steps: [
      <>If the account has 2-step sign-in, create an <strong>app password</strong> at <strong>account.microsoft.com › Security</strong>.</>,
      <>For Microsoft 365 business mailboxes, your admin must allow <strong>Authenticated SMTP</strong> for the mailbox.</>,
      <>Paste the password here, save, then send a test email.</>,
    ],
  },
  hostinger: {
    title: "Hostinger mailbox",
    steps: [
      <>Use your mailbox from <strong>hPanel › Emails</strong> (e.g. info@yourgym.com).</>,
      <>Use the full mailbox address and the mailbox's own password — no app password needed.</>,
      <>Save, then send a test email.</>,
    ],
  },
  zoho: {
    title: "Zoho Mail password",
    steps: [
      <>If two-factor sign-in is on, create an <strong>application-specific password</strong> in Zoho Accounts › Security.</>,
      <>Otherwise use the mailbox password. Save, then send a test email.</>,
    ],
  },
  custom: {
    title: "Other providers",
    steps: [
      <>Find the <strong>SMTP</strong> settings on your email provider's help page: host, port and security.</>,
      <>Port 465 normally uses <strong>SSL</strong>, port 587 uses <strong>STARTTLS</strong>.</>,
      <>Use the full email address and its password (or app password). Save, then send a test email.</>,
    ],
  },
};

const providerOf = (host: string): ProviderId =>
  PROVIDERS.find((p) => p.host === host.trim().toLowerCase())?.id ?? "custom";

const toForm = (s: Saved | null): Form => {
  const gmail = PROVIDERS[0];
  const fresh = !s?.saved;
  return {
    enabled: s?.enabled ?? true,
    host: fresh ? gmail.host : s?.host ?? "",
    port: fresh ? String(gmail.port) : s?.port != null ? String(s.port) : "",
    security: fresh ? gmail.security : s?.security ?? "STARTTLS",
    email: s?.fromEmail ?? s?.username ?? "",
    password: "",
    senderName: s?.fromName ?? "",
  };
};

const fmt = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

export function EmailSettings() {
  const canEdit = usePermission("SETTINGS_EDIT");
  const { currencyCode, currency } = useCurrency();
  const { activeBranchName } = useBranch();
  const [saved, setSaved] = useState<Saved | null>(null);
  const [form, setForm] = useState<Form>(toForm(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [attachInvoice, setAttachInvoice] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testStep, setTestStep] = useState("");

  const load = useCallback(async () => {
    try {
      const s = await emailSettingsService.get();
      setSaved(s);
      setForm(toForm(s));
      setTestTo((t) => t || s.fromEmail || "");
    } catch (e) {
      toast.error(emailSettingsError(e, "Could not load email settings"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isDirty = useMemo(() => {
    if (!saved?.saved) return true; // nothing saved yet — the defaults still need saving
    const base = toForm(saved);
    return (Object.keys(base) as (keyof Form)[]).some((k) => form[k] !== base[k]);
  }, [form, saved]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const provider = providerOf(form.host);

  const pickProvider = (id: string) => {
    const p = PROVIDERS.find((x) => x.id === id);
    if (p) setForm((f) => ({ ...f, host: p.host, port: String(p.port), security: p.security }));
    else setForm((f) => ({ ...f, host: providerOf(f.host) === "custom" ? f.host : "" }));
  };

  const save = async () => {
    const email = form.email.trim();
    if (form.enabled && (!form.host.trim() || !form.port.trim() || !email)) {
      toast.error("Fill in the SMTP host, port and email address");
      return;
    }
    if (form.enabled && !form.password && !saved?.hasPassword) {
      toast.error("Enter the app password");
      return;
    }
    setSaving(true);
    try {
      const s = await emailSettingsService.save({
        enabled: form.enabled,
        host: form.host.trim(),
        port: form.port.trim() ? Number(form.port) : null,
        security: form.security,
        // One address: the mailbox GymBios logs in to and sends from.
        username: email,
        fromEmail: email,
        password: form.password ? form.password.replace(/\s+/g, "") : undefined,
        fromName: form.senderName.trim(),
        replyTo: "",
      });
      setSaved(s);
      setForm(toForm(s));
      setTestTo((t) => t || s.fromEmail || "");
      toast.success("Email settings saved — now send a test email");
    } catch (e) {
      toast.error(emailSettingsError(e, "Could not save the email settings"));
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testTo.trim()) { toast.error("Enter the address to send the test to"); return; }
    setTesting(true);
    try {
      let pdf: { base64: string; fileName: string } | undefined;
      if (attachInvoice) {
        setTestStep("Creating the test invoice…");
        pdf = await buildTestInvoicePdf({
          currencyCode, currencyPrefix: currency.textPrefix, branchName: activeBranchName || "Main Branch",
        });
      }
      setTestStep("Sending…");
      const r = await emailSettingsService.test(testTo.trim(), pdf);
      if (r.ok) toast.success(r.message, { duration: 8000 }); else toast.error(r.message, { duration: 15000 });
      await load();
    } catch (e) {
      toast.error(emailSettingsError(e, e instanceof Error ? e.message : "The test email could not be sent"), { duration: 12000 });
    } finally {
      setTesting(false);
      setTestStep("");
    }
  };

  if (loading) {
    return <div className={styles.loading}><Loader2 className="h-5 w-5 animate-spin" /> Loading email settings…</div>;
  }

  const source = saved?.activeSource ?? "NONE";
  const disabled = !canEdit;
  const help = PROVIDER_HELP[provider];

  return (
    <div className="sp-panel">
      <div className={styles.status} data-tone={source === "GYM" ? "green" : source === "SERVER" ? "blue" : "amber"}>
        {source === "NONE" ? <AlertTriangle className="h-5 w-5" /> : <Server className="h-5 w-5" />}
        <div>
          <div className={styles.statusTitle}>
            {source === "GYM" && <>Emails go out through your mailbox: <strong>{saved?.fromEmail}</strong></>}
            {source === "SERVER" && <>Emails go out through the GymBios server's default mailbox</>}
            {source === "NONE" && <>Email is not set up — reports and notifications can't be emailed yet</>}
          </div>
          <div className={styles.statusSub}>
            These settings apply to the whole gym (every branch), not just {activeBranchName || "this branch"}.
          </div>
        </div>
      </div>

      <div className="sp-grid sp-grid--3-2 sp-stretch">
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>SMTP Configuration</CardTitle>
            </div>
            <CardDescription>The sender account used for reports, receipts and other emails.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className={styles.switchRow}>
              <div>
                <div className={styles.switchLabel}>Enable email</div>
                <div className={styles.hint}>Turn this on to send emails from this account.</div>
              </div>
              <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} disabled={disabled} />
            </div>

            <div className={styles.grid3}>
              <Field label="Mail provider" hint="Picks the host, port and security for you. Choose “Other” if yours isn't listed." wide>
                <Select value={provider} onValueChange={pickProvider} disabled={disabled}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                    <SelectItem value="custom">Other (enter manually)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="SMTP host">
                <IconInput icon={<Server />} value={form.host} onChange={(v) => set("host", v)} placeholder="smtp.yourprovider.com" disabled={disabled} />
              </Field>
              <Field label="Port">
                <Input type="number" value={form.port} onChange={(e) => set("port", e.target.value)} placeholder="587" disabled={disabled} />
              </Field>
              <Field label="Security">
                <Select value={form.security} onValueChange={(v) => set("security", v as MailSecurity)} disabled={disabled}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STARTTLS">STARTTLS</SelectItem>
                    <SelectItem value="SSL">SSL</SelectItem>
                    <SelectItem value="NONE">None</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Email address" hint="The mailbox GymBios signs in to and sends from." wide>
                <IconInput icon={<AtSign />} value={form.email} onChange={(v) => set("email", v)} placeholder="yourgym@gmail.com" disabled={disabled} />
              </Field>

              <Field label="App password" className={styles.span2}
                hint="Gmail and Microsoft 365 with 2-step sign-in need an App Password. Most other providers use the normal mailbox password.">
                <IconInput icon={<KeyRound />} type="password" value={form.password} onChange={(v) => set("password", v)}
                  placeholder={saved?.hasPassword ? "Saved — type to replace" : "16-character app password"} disabled={disabled} />
              </Field>
              <Field label="Sender name" hint="Shown as the sender.">
                <IconInput icon={<Tag />} value={form.senderName} onChange={(v) => set("senderName", v)} placeholder="Your gym name" disabled={disabled} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <div className={styles.side}>
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                <CardTitle>Send Test Email</CardTitle>
              </div>
              <CardDescription>Save your settings first, then send a test to confirm the mailbox works.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <IconInput icon={<Mail />} value={testTo} onChange={setTestTo} placeholder="Send test to this email…" disabled={disabled || testing} />
              <label className={styles.checkRow}>
                <Checkbox checked={attachInvoice} onCheckedChange={(v) => setAttachInvoice(v === true)} disabled={disabled || testing} />
                <span>
                  <span className={styles.switchLabel}><FileText className={styles.inlineIcon} /> Attach a test invoice (PDF)</span>
                  <span className={styles.hint}>A sample invoice with your logo and company details, marked as a test.</span>
                </span>
              </label>
              <Button className="w-full" onClick={sendTest}
                disabled={disabled || testing || isDirty || !saved?.saved || !saved?.host}>
                {testing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {testStep || "Sending…"}</> : <><Send className="h-4 w-4 mr-2" /> Send Test Email</>}
              </Button>
              {isDirty && <div className={styles.hint}>Save your changes first — the test uses the saved settings.</div>}
              {saved?.lastTestMessage && (
                <div className={styles.note} data-tone={saved.lastTestOk ? "green" : "red"}>
                  {saved.lastTestOk ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  <span><strong>{fmt(saved.lastTestAt)}</strong> — {saved.lastTestMessage}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`bg-white border-0 shadow-sm ${styles.helpCard}`}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                <CardTitle>{help.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ol className={styles.steps}>{help.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </CardContent>
          </Card>
        </div>
      </div>

      <SettingsSaveBar
        isDirty={isDirty}
        saving={saving}
        onSave={save}
        label="Save Email Settings"
        disabled={disabled}
        note={disabled ? "You can view these settings but not change them." : !saved?.saved ? "Not saved yet" : undefined}
      />
    </div>
  );
}

function Field({ label, hint, wide, className, children }: {
  label: string; hint?: string; wide?: boolean; className?: string; children: React.ReactNode;
}) {
  const cls = [styles.field, wide ? styles.fieldWide : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <Label>{label}</Label>
      {children}
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  );
}

function IconInput({ icon, value, onChange, placeholder, type = "text", disabled }: {
  icon: React.ReactNode; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <div className={styles.iconInput}>
      <span className={styles.iconInputIcon}>{icon}</span>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        disabled={disabled} autoComplete={type === "password" ? "new-password" : "off"} className={styles.iconInputField} />
    </div>
  );
}
