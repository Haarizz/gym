import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { useCurrency } from '../../utils/currency';
import { purchaseService, Supplier } from '../../utils/supabase/purchase-service';
import styles from './PurchaseInvoice.module.css';
import { PAYMENT_TERMS, normaliseTerms } from './purchaseInvoiceUtils';

// Page chrome shared by the Purchase Invoices, Purchase Orders and Suppliers modules.

export const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');

// ── Header ───────────────────────────────────────────────────────────────────

export type HeaderTab = { key: string; label: string; icon: React.ElementType; active: boolean; onClick: () => void };

export function ModuleHeader({ section = 'Sales & Purchases', title, icon: Icon, subtitle, meta, actions, tabs }: {
  section?: string;
  title: string;
  icon: React.ElementType;
  subtitle: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: HeaderTab[];
}) {
  return (
    <div className={styles.header}>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.crumbs}>
            <span>{section}</span>
            <ChevronRight size={12} />
            <strong>{title}</strong>
          </div>
          <h1 className={styles.title}><Icon className={styles.titleIcon} size={26} /> {title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          {meta && <div className={styles.headerMeta}>{meta}</div>}
        </div>
        {actions && <div className={styles.headerActions}>{actions}</div>}
      </div>
      {tabs && tabs.length > 0 && (
        <div className={styles.tabs}>
          {tabs.map(t => (
            <button key={t.key} type="button" className={cx(styles.tab, t.active && styles.tabActive)} onClick={t.onClick}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stat card (standard GymBios module style) ────────────────────────────────

const STAT_TONES = {
  green:  { chip: 'bg-green-50',  icon: 'text-green-600',  value: 'text-green-700' },
  red:    { chip: 'bg-red-50',    icon: 'text-red-600',    value: 'text-red-700' },
  orange: { chip: 'bg-orange-50', icon: 'text-orange-600', value: 'text-orange-700' },
  blue:   { chip: 'bg-blue-50',   icon: 'text-blue-600',   value: 'text-blue-700' },
  purple: { chip: 'bg-purple-50', icon: 'text-purple-600', value: 'text-purple-700' },
};

export function StatCard({ title, value, sub, icon: Icon, tone, loading }: {
  title: string; value: React.ReactNode; sub: string; icon: React.ElementType; tone: keyof typeof STAT_TONES; loading: boolean;
}) {
  const t = STAT_TONES[tone];
  return (
    <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-primary">{title}</CardTitle>
        <div className={cx(t.chip, 'p-2 rounded-lg')}>
          <Icon className={cx('h-4 w-4', t.icon)} />
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className={styles.skeleton} style={{ width: 110, height: 24 }} />
          : <div className={cx('text-2xl font-bold', t.value)}>{value}</div>}
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ── Preview building blocks ──────────────────────────────────────────────────

export function copy(value: string, label: string) {
  navigator.clipboard?.writeText(value).then(
    () => toast.success(`${label} copied`),
    () => toast.error('Could not copy to clipboard'),
  );
}

export function InfoRow({ label, value, copyable }: { label: string; value?: React.ReactNode; copyable?: boolean }) {
  const has = value !== undefined && value !== null && value !== '';
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      {has ? (
        copyable && typeof value === 'string' ? (
          <button type="button" className={cx(styles.copyBtn, styles.infoValue)} onClick={() => copy(value, label)} title={`Copy ${label}`}>
            {value} <Copy size={11} />
          </button>
        ) : (
          <span className={styles.infoValue}>{value}</span>
        )
      ) : (
        <span className={styles.muted}>—</span>
      )}
    </div>
  );
}

export function RailCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className={styles.panel}>
      <div className={styles.railHead}>
        <h3 className={styles.panelTitle}><Icon size={14} /> {title}</h3>
      </div>
      <div className={styles.railBody}>{children}</div>
    </section>
  );
}

// ── Small controls ───────────────────────────────────────────────────────────

export function IconBtn({ title, onClick, tone, disabled, children }: {
  title: string; onClick: () => void; tone?: string; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button type="button" title={title} aria-label={title} disabled={disabled} onClick={onClick} className={cx(styles.iconBtn, tone)}>
      {children}
    </button>
  );
}

export function NativeSelect({ value, onChange, options, label }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string;
}) {
  return (
    <div className={styles.selectWrap}>
      <select className={styles.nativeSelect} value={value} onChange={e => onChange(e.target.value)} aria-label={label}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={12} />
    </div>
  );
}

// ── Supplier form ────────────────────────────────────────────────────────────

const emptySupplier = (): Partial<Supplier> => ({
  name: '', contactPerson: '', email: '', phone: '', address: '', city: '', country: 'UAE', taxId: '',
  paymentTerms: 'NET 30', creditLimit: 0, isActive: true, notes: '',
});

/** Create / edit a supplier. `onSaved` receives the saved record. */
export function SupplierFormDialog({ open, supplier, initialName, onOpenChange, onSaved }: {
  open: boolean;
  supplier: Supplier | null;
  initialName?: string; // prefill for a new supplier (e.g. what was typed in a search box)
  onOpenChange: (open: boolean) => void;
  onSaved: (s: Supplier) => void;
}) {
  const { currencyCode } = useCurrency();
  const [form, setForm] = useState<Partial<Supplier>>(emptySupplier);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(supplier ? { ...supplier, paymentTerms: normaliseTerms(supplier.paymentTerms) || supplier.paymentTerms } : { ...emptySupplier(), name: initialName ?? '' });
  }, [open, supplier]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Supplier>(k: K, v: Supplier[K]) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name?.trim()) { toast.error('Supplier name is required'); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error('Enter a valid email address'); return; }
    if ((form.creditLimit ?? 0) < 0) { toast.error('Credit limit cannot be negative'); return; }
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim() };
      const saved = supplier
        ? await purchaseService.updateSupplier(supplier.id, payload)
        : await purchaseService.createSupplier(payload);
      toast.success(supplier ? 'Supplier updated' : 'Supplier created');
      onSaved(saved);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const terms = PAYMENT_TERMS.some(t => t.value === form.paymentTerms) ? form.paymentTerms : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          <DialogDescription>{supplier ? `Update details for ${supplier.name}` : 'Create a new supplier you buy stock or services from'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 4 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name *</Label>
              <Input placeholder="Company name" value={form.name ?? ''} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input placeholder="Contact name" value={form.contactPerson ?? ''} onChange={e => set('contactPerson', e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="email@company.com" value={form.email ?? ''} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input placeholder="+971-4-xxx-xxxx" value={form.phone ?? ''}
                onChange={e => { const v = e.target.value; if (/^[\d+\-\s()]*$/.test(v)) set('phone', v); }} />
            </div>
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Input placeholder="Street address" value={form.address ?? ''} onChange={e => set('address', e.target.value)} />
            </div>
            <div>
              <Label>City</Label>
              <Input placeholder="City" value={form.city ?? ''} onChange={e => set('city', e.target.value)} />
            </div>
            <div>
              <Label>Country</Label>
              <Input placeholder="Country" value={form.country ?? ''} onChange={e => set('country', e.target.value)} />
            </div>
            <div>
              <Label>Tax ID / TRN</Label>
              <Input placeholder="Tax registration number" value={form.taxId ?? ''} onChange={e => set('taxId', e.target.value)} />
            </div>
            <div>
              <Label>Payment Terms</Label>
              <div className={styles.selectWrap}>
                <select className={cx(styles.field, styles.fieldSelect)} value={terms} onChange={e => set('paymentTerms', e.target.value)}>
                  <option value="">{form.paymentTerms && !terms ? form.paymentTerms : 'Select terms'}</option>
                  {PAYMENT_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown size={14} />
              </div>
            </div>
            <div>
              <Label>Credit Limit ({currencyCode})</Label>
              <Input type="number" min="0" step="100" value={form.creditLimit ?? 0}
                onChange={e => set('creditLimit', Math.max(0, parseFloat(e.target.value) || 0))} />
            </div>
            <div>
              <Label>Rating (0–5)</Label>
              <Input type="number" min="0" max="5" step="0.1" value={form.rating ?? ''}
                onChange={e => set('rating', e.target.value === '' ? undefined : Math.min(5, Math.max(0, parseFloat(e.target.value) || 0)))} />
            </div>
            <div className="md:col-span-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <Label>Active supplier</Label>
                <p className="text-xs text-muted-foreground">Inactive suppliers are hidden when creating new orders and invoices.</p>
              </div>
              <Switch checked={form.isActive !== false} onCheckedChange={v => set('isActive', v)} />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea placeholder="Notes about this supplier..." rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {supplier ? 'Update Supplier' : 'Create Supplier'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
