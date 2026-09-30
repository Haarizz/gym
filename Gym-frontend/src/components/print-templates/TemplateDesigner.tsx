import React, { useMemo, useState } from 'react';
import {
  AlignLeft, ArrowLeft, Building2, Check, CreditCard, Eye, FileText, Info, Layout, Loader2, Palette, Printer, Save,
  Table as TableIcon, Truck, Type,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import type { CompanyDetails } from '../../utils/company-details';
import type { CurrencyCode } from '../../utils/currency';
import {
  DocumentView, PAPER_MM, docTypeMeta, isInvoiceType, sampleDocument, shippingLabel,
  type DocTemplateSettings, type DocType, type PaperSize,
} from './documentTemplate';
import { printDocumentHtml, printHtml } from './purchasePrint';
import styles from './PrintTemplates.module.css';

const MM_TO_PX = 96 / 25.4;

type TabId = 'style' | 'company' | 'supplier' | 'doc' | 'table' | 'footer';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'style', label: 'Style', icon: Palette },
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'supplier', label: 'Supplier', icon: Truck },
  { id: 'doc', label: 'Doc info', icon: FileText },
  { id: 'table', label: 'Table', icon: TableIcon },
  { id: 'footer', label: 'Footer', icon: CreditCard },
];

const FONTS = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: "'Times New Roman', serif", label: 'Times New Roman' },
];

// ── Small controls ───────────────────────────────────────────────────────────

function Group({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className={styles.group}>
      <h4 className={styles.groupTitle}><Icon size={14} /> {title}</h4>
      {children}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}{hint && <span className={styles.rowHint}>{hint}</span>}</span>
      {children}
    </div>
  );
}

function ColorPick({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span className={styles.color}>
      <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'} onChange={e => onChange(e.target.value)} aria-label="Pick colour" />
      <input type="text" value={value} onChange={e => onChange(e.target.value)} aria-label="Colour hex" />
    </span>
  );
}

// ── Designer ─────────────────────────────────────────────────────────────────

export function TemplateDesigner({ docType, initial, initialDefault, company, currencyCode, branchName, saving, onClose, onSave }: {
  docType: DocType;
  initial: DocTemplateSettings;
  /** Whether the template already is (or, for the first of its type, will be) the default. */
  initialDefault: boolean;
  company: CompanyDetails;
  currencyCode: CurrencyCode;
  branchName: string;
  saving: boolean;
  onClose: () => void;
  onSave: (settings: DocTemplateSettings, makeDefault: boolean) => void;
}) {
  const navigate = useNavigate();
  const [s, setS] = useState<DocTemplateSettings>(initial);
  const [baseline] = useState(() => JSON.stringify(initial));
  const [tab, setTab] = useState<TabId>('style');
  const [zoom, setZoom] = useState(0.75);
  const [makeDefault, setMakeDefault] = useState(initialDefault);
  const [confirmLeave, setConfirmLeave] = useState<null | (() => void)>(null);
  const meta = docTypeMeta(docType);
  const isPO = docType === 'purchase-order';
  const isSI = docType === 'sales-invoice';
  const isPI = docType === 'purchase-invoice';
  const isInv = isInvoiceType(docType);
  const party = isSI ? 'Customer' : 'Supplier';
  const dirty = JSON.stringify(s) !== baseline || makeDefault !== initialDefault;

  const upd = <K extends keyof DocTemplateSettings>(k: K, v: DocTemplateSettings[K]) => setS(p => ({ ...p, [k]: v }));
  const toggle = (k: keyof DocTemplateSettings, label: string, hint?: string) => (
    <Row label={label} hint={hint}>
      <Switch checked={!!s[k]} onCheckedChange={v => upd(k, v as never)} aria-label={label} />
    </Row>
  );

  const sample = useMemo(() => sampleDocument(docType, company, currencyCode), [docType, company, currencyCode]);
  const paper = PAPER_MM[s.paperSize] ?? PAPER_MM.A4;

  const leave = (action: () => void) => (dirty ? setConfirmLeave(() => action) : action());

  const save = () => {
    if (!s.templateName.trim()) { toast.error('Template name is required'); return; }
    onSave({ ...s, templateName: s.templateName.trim() }, makeDefault);
  };

  const testPrint = () => {
    printHtml(printDocumentHtml(s, sample), s.paperSize).catch(() => toast.error('Failed to open the print dialog'));
  };

  const uploadStamp = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) { toast.error('Stamp image must be less than 1MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => upd('stampUrl', String(ev.target?.result ?? ''));
    reader.readAsDataURL(file);
  };

  return (
    <div className={styles.designer}>
      {/* ── Top bar ── */}
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <button type="button" className={styles.backBtn} onClick={() => leave(onClose)}>
            <ArrowLeft size={16} /> Back
          </button>
          <span className={styles.divider} />
          <span className={styles.docName}>
            <span className={styles.dot} style={{ background: s.accentColor }} />
            {s.templateName || 'Untitled template'}
          </span>
          <span className={`${styles.pill} ${styles.pillPrimary}`}>{meta.label}</span>
          {dirty && <span className={styles.pill}>Unsaved changes</span>}
        </div>
        <div className={styles.topRight}>
          <div className={styles.zoom}>
            <button type="button" aria-label="Zoom out" onClick={() => setZoom(z => Math.max(0.4, +(z - 0.05).toFixed(2)))}>−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom(z => Math.min(1.3, +(z + 0.05).toFixed(2)))}>+</button>
          </div>
          <label className={styles.defaultSwitch} title={initialDefault ? 'This template is the default — pick another template as default to change it' : undefined}>
            <Switch checked={makeDefault} disabled={initialDefault} onCheckedChange={setMakeDefault} aria-label="Use as default" />
            Default for {meta.label.toLowerCase()}s
          </label>
          <Button variant="outline" onClick={testPrint}><Printer className="h-4 w-4" /> Test print</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save template
          </Button>
        </div>
      </div>

      <div className={styles.body}>
        {/* ── Settings panel ── */}
        <aside className={styles.side}>
          <div className={styles.sideTop}>
            <Input value={s.templateName} onChange={e => upd('templateName', e.target.value)} placeholder="Template name" aria-label="Template name" />
            <div className={styles.tabGrid}>
              {TABS.map(t => (
                <button key={t.id} type="button" className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ''}`} onClick={() => setTab(t.id)}>
                  <t.icon size={14} /> {t.id === 'supplier' ? party : t.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.sideScroll}>
            {tab === 'style' && <>
              <Group icon={Layout} title="Page">
                <Row label="Paper size">
                  <select className={styles.select} value={s.paperSize} onChange={e => upd('paperSize', e.target.value as PaperSize)}>
                    <option value="A4">A4</option>
                    <option value="A5">A5</option>
                    <option value="Letter">Letter</option>
                  </select>
                </Row>
              </Group>
              <Group icon={Palette} title="Colours">
                <Row label="Accent / highlight"><ColorPick value={s.accentColor} onChange={v => upd('accentColor', v)} /></Row>
                <Row label="Grand total colour"><ColorPick value={s.grandTotalColor} onChange={v => upd('grandTotalColor', v)} /></Row>
                <Row label="Table header background"><ColorPick value={s.tableHeaderBg} onChange={v => upd('tableHeaderBg', v)} /></Row>
                <Row label="Table header text"><ColorPick value={s.tableHeaderText} onChange={v => upd('tableHeaderText', v)} /></Row>
                <Row label="Totals row background"><ColorPick value={s.totalRowBg} onChange={v => upd('totalRowBg', v)} /></Row>
                <Row label="Border colour"><ColorPick value={s.borderColor} onChange={v => upd('borderColor', v)} /></Row>
              </Group>
              <Group icon={Type} title="Typography">
                <Row label="Font family">
                  <select className={styles.select} value={s.fontFamily} onChange={e => upd('fontFamily', e.target.value)}>
                    {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </Row>
                <Row label="Font size (px)">
                  <input type="number" min={7} max={13} className={styles.number} value={s.fontSize}
                    onChange={e => upd('fontSize', Math.min(13, Math.max(7, Number(e.target.value) || 9)))} />
                </Row>
              </Group>
              <Group icon={Eye} title="Extras">
                {toggle('showGrandTotalBanner', isInv ? 'Grand total / balance banner' : 'Grand total banner')}
                {toggle('showWatermark', 'Watermark')}
                {s.showWatermark && (
                  <Row label="Watermark text">
                    <input className={styles.textInput} value={s.watermarkText} onChange={e => upd('watermarkText', e.target.value)} />
                  </Row>
                )}
                {toggle('showPageNumbers', 'Page numbers')}
              </Group>
            </>}

            {tab === 'company' && <>
              <div className={styles.note}>
                <Info size={16} />
                <span>
                  Logo, stamp, name, address, phone, email and TRN are read from <b>Settings › Company Details</b> of the branch each
                  document belongs to, so every branch prints its own header. The preview shows <b>{branchName}</b>.{' '}
                  <button type="button" className={styles.linkBtn} onClick={() => leave(() => navigate('/settings'))}>Edit company details</button>
                </span>
              </div>
              <Group icon={Building2} title="Company header">
                {toggle('showLogo', 'Logo', company.logo ? undefined : 'No logo uploaded for this branch yet')}
                {toggle('showCompanyName', 'Company name')}
                {toggle('showCompanyAddress', 'Address')}
                {toggle('showCompanyPhone', 'Phone')}
                {toggle('showCompanyEmail', 'Email')}
                {toggle('showTRN', 'TRN (VAT number)')}
              </Group>
            </>}

            {tab === 'supplier' && <>
              <Group icon={Truck} title="Address sections">
                {toggle('showBillTo', isSI ? 'Bill To block' : 'Supplier block')}
                {isPO && toggle('showShipTo', 'Deliver to', 'The order’s delivery address')}
              </Group>
              <Group icon={Truck} title={`${party} fields`}>
                {toggle('showSupplierContact', isSI ? 'Member ID' : 'Contact person', isSI ? 'Printed for member customers' : undefined)}
                {toggle('showSupplierAddress', 'Address')}
                {toggle('showSupplierPhone', 'Phone')}
                {toggle('showSupplierEmail', 'Email')}
                {toggle('showSupplierTRN', `${party} TRN`)}
              </Group>
              {isInv && (
                <div className={styles.note}>
                  <Info size={16} />
                  <span>Bank details on the Footer tab print only once at least one bank field is filled in.</span>
                </div>
              )}
            </>}

            {tab === 'doc' && <>
              <Group icon={FileText} title="Document fields">
                {toggle('showDocNumber', isPO ? 'PO number' : 'Invoice number')}
                {toggle('showDocDate', isPO ? 'Order date' : 'Invoice date')}
                {toggle('showDueDate', isPO ? 'Deliver by' : 'Due date')}
                {toggle('showPaymentTerms', 'Payment terms', isPI ? "From the supplier's terms" : undefined)}
                {isPI && toggle('showSupplierInvoiceNo', 'Supplier invoice number')}
                {isPI && toggle('showPOReference', 'Purchase order reference')}
                {isSI && toggle('showPOReference', 'Customer reference', 'The invoice’s Reference field')}
                {isSI && toggle('showSalesperson', 'Salesperson')}
                {isPI && toggle('showWarehouse', 'Warehouse / store')}
                {isPI && toggle('showReceivedBy', 'Received by')}
                {!isSI && toggle('showPriority', 'Priority')}
                {toggle('showPreparedBy', 'Prepared by / account exec')}
                {isPO && toggle('showApprovedBy', 'Approved by')}
                {toggle('showCurrency', 'Currency')}
                <Row label="Show currency as code" hint="e.g. AED instead of the symbol">
                  <Switch checked={s.currencyDisplay === 'code'} onCheckedChange={v => upd('currencyDisplay', v ? 'code' : 'symbol')} />
                </Row>
              </Group>
            </>}

            {tab === 'table' && <>
              <Group icon={TableIcon} title="Table columns">
                {toggle('showRowLines', 'Row separator lines')}
                {toggle('colNo', '# Line no.')}
                {toggle('colProductImage', 'Product image', 'First image from the product')}
                {toggle('colItemCode', 'Item code / name')}
              </Group>
              <Group icon={AlignLeft} title="Item sub-info (below name)">
                {toggle('colBrand', 'Brand')}
                {toggle('colSKU', 'SKU')}
                {toggle('colBarcode', 'Barcode')}
              </Group>
              <Group icon={TableIcon} title="Other columns">
                {toggle('colDescription', 'Description')}
                {toggle('showShortDescription', 'Short description', 'First line of the product description')}
                {toggle('showDetailedDescription', 'Detailed description', 'Remaining lines and line notes')}
                {toggle('colUOM', 'UOM')}
                {toggle('colQty', 'Quantity')}
                {isPO && toggle('colReceivedQty', 'Received quantity')}
                {toggle('colUnitPrice', 'Unit price')}
                {toggle('colTaxableAmount', 'Taxable amount')}
                {toggle('colDiscount', 'Discount %')}
                {toggle('colVAT', 'VAT %')}
                {toggle('colVATAmount', 'VAT amount')}
                {toggle('colLineTotal', 'Line total')}
              </Group>
              <Group icon={CreditCard} title="Totals block">
                {toggle('showTaxableTotal', 'Taxable amount')}
                {toggle('showSubtotal', 'Sub total')}
                {toggle('showDiscountTotal', 'Discount total')}
                {toggle('showVATTotal', 'VAT total')}
                {toggle('showShipping', shippingLabel(docType))}
                {isSI && toggle('showRoundOff', 'Round off', 'Only printed when the invoice has one')}
                {toggle('showGrandTotal', 'Grand total')}
                {isInv && toggle('showPaidBalance', 'Paid & balance due')}
                {toggle('showAmountInWords', 'Amount in words')}
              </Group>
            </>}

            {tab === 'footer' && <>
              <Group icon={CreditCard} title="Bank details">
                {toggle('showBankDetails', 'Show bank details')}
                {s.showBankDetails && ([
                  ['bankName', 'Bank name'], ['bankAccount', 'Account number'], ['bankIBAN', 'IBAN'], ['bankSWIFT', 'SWIFT / BIC'],
                ] as const).map(([k, label]) => (
                  <div key={k} className={styles.block}>
                    <label htmlFor={`pt-${k}`}>{label}</label>
                    <Input id={`pt-${k}`} value={s[k]} onChange={e => upd(k, e.target.value)} />
                  </div>
                ))}
              </Group>
              <Group icon={AlignLeft} title="Terms & conditions">
                {toggle('showTerms', 'Show terms')}
                {s.showTerms && <>
                  <div className={styles.block}>
                    <Textarea rows={5} value={s.termsText} onChange={e => upd('termsText', e.target.value)} aria-label="Terms and conditions" />
                  </div>
                  <Row label="Background colour"><ColorPick value={s.termsBgColor} onChange={v => upd('termsBgColor', v)} /></Row>
                </>}
              </Group>
              <Group icon={FileText} title="Notes">
                {toggle('showNotes', 'Show notes', isPO ? 'Prints the order’s notes' : 'Prints the invoice’s notes')}
                {s.showNotes && <>
                  <Row label="Notes label">
                    <input className={styles.textInput} value={s.notesLabel} onChange={e => upd('notesLabel', e.target.value)} />
                  </Row>
                  <Row label="Background colour" hint="Leave white for none">
                    <ColorPick value={s.notesBgColor || '#ffffff'} onChange={v => upd('notesBgColor', v.toLowerCase() === '#ffffff' ? '' : v)} />
                  </Row>
                </>}
              </Group>
              <Group icon={Check} title="Stamp & verification">
                {toggle('showCompanyStamp', 'Company stamp', 'From Settings › Company Details of each branch')}
                {s.showCompanyStamp && company.stamp && (
                  <div className={styles.note}>
                    <Info size={16} />
                    <span>
                      Printing <b>{branchName}</b>’s stamp from Settings.{' '}
                      <button type="button" className={styles.linkBtn} onClick={() => leave(() => navigate('/settings'))}>Change stamp</button>
                    </span>
                  </div>
                )}
                {s.showCompanyStamp && !company.stamp && (
                  <div className={styles.block}>
                    <label>
                      {branchName} has no stamp yet —{' '}
                      <button type="button" className={styles.linkBtn} onClick={() => leave(() => navigate('/settings'))}>add it in Settings</button>
                      , or upload a fallback used for any branch without one:
                    </label>
                    <div className={styles.upload}>
                      <div className={styles.uploadBox}>{s.stampUrl ? <img src={s.stampUrl} alt="Stamp" /> : 'Stamp'}</div>
                      <div>
                        <label htmlFor="pt-stamp" className={styles.linkBtn} style={{ display: 'inline', fontSize: 14 }}>
                          {s.stampUrl ? 'Change image' : 'Upload image'}
                        </label>
                        <input id="pt-stamp" type="file" accept="image/*" hidden onChange={uploadStamp} />
                        {s.stampUrl && <><br /><button type="button" className={styles.linkBtn} style={{ color: '#dc2626' }} onClick={() => upd('stampUrl', '')}>Remove</button></>}
                      </div>
                    </div>
                  </div>
                )}
                {toggle('showQRCode', 'QR code', 'Scannable document summary')}
                {toggle('showSignatures', 'Signature lines', 'Prepared by / Authorised signatory')}
              </Group>
            </>}
          </div>
        </aside>

        {/* ── Live preview ── */}
        <div className={styles.canvas}>
          <div className={styles.canvasBar}>
            <span className={styles.hint}><Info size={14} /> Live preview — sample items with {branchName}’s company details</span>
            <span className={styles.pills} style={{ marginTop: 0 }}>
              <span className={styles.pill}>{s.paperSize}</span>
              <span className={styles.pill}>Classic</span>
            </span>
          </div>
          <div className={styles.paper} style={{ width: paper.w * MM_TO_PX, minHeight: paper.h * MM_TO_PX, zoom } as React.CSSProperties}>
            <div style={{ minHeight: paper.h * MM_TO_PX, display: 'flex', flexDirection: 'column' }}>
              <DocumentView s={s} doc={sample} />
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={!!confirmLeave} onOpenChange={o => { if (!o) setConfirmLeave(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>Your changes to “{s.templateName}” haven’t been saved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const go = confirmLeave; setConfirmLeave(null); go?.(); }}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
