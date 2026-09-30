import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Check, ChevronDown, Copy, Edit, FileStack, Layers, LayoutGrid, Loader2, Minus, PackageOpen, Plus, Printer,
  RotateCcw, ScanBarcode, Search, ShoppingBag, Star, Tags, Trash2,
} from 'lucide-react';
import { toast as sonner, type ExternalToast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { CurrencyValue, useCurrency } from '../utils/currency';
import { getCompanyDetails } from '../utils/company-details';
import { productsService, type Product } from '../utils/supabase/products-service';
import { printTemplateService } from '../utils/supabase/print-template-service';
import { supplierBillService } from '../utils/supabase/supplier-bill-service';
import { IconBtn, ModuleHeader, StatCard, cx } from '../components/purchase/purchaseUi';
import { Thumb } from '../components/purchase/lineEntry';
import pi from '../components/purchase/PurchaseInvoice.module.css';
import styles from '../components/barcode/BarcodePrint.module.css';
import {
  BUILT_IN_TEMPLATES, FORMAT_OPTIONS, LabelView, barcodeOptions, labelDataOf, labelWarnings, layoutLabel, normalizeSettings,
  printLabels, queueItemFor, sampleLabelData, sheetMetrics, sizeLabel, templateFromSaved,
  type LabelSettings, type LabelTemplate, type QueueItem,
} from '../components/barcode/barcodeLabels';
import { BarcodeTemplateDesigner } from '../components/barcode/BarcodeTemplateDesigner';
import { LoadPurchaseDialog, queueItemsFromBill, type BillLoadResult } from '../components/barcode/LoadPurchaseDialog';

/**
 * Other screens open this page with router state to pre-fill the print queue:
 * navigate('/barcode-print', { state: { barcodePrint: { productIds: [1, 2] } } })
 * navigate('/barcode-print', { state: { barcodePrint: { billId: 12 } } })
 */
export interface BarcodePrintRequest {
  productIds?: number[];
  billId?: number;
}

// The global toaster sits bottom-right, right over the Print button — show this page's toasts at the top.
const TOAST_POSITION: ExternalToast = { position: 'top-center' };
const toast = {
  success: (message: string, opts?: ExternalToast) => sonner.success(message, { ...TOAST_POSITION, ...opts }),
  error: (message: string, opts?: ExternalToast) => sonner.error(message, { ...TOAST_POSITION, ...opts }),
};

type Tab = 'print' | 'templates';
type Editing = { template: LabelTemplate | null; basedOn?: string; name: string; settings: LabelSettings };

const TEMPLATE_KEY = 'gymbios.barcodePrint.template';
const QUEUE_KEY = 'gymbios.barcodePrint.queue';
const MAX_LABELS_PER_ROW = 9999;

const storage = {
  get(store: Storage, key: string) { try { return store.getItem(key); } catch { return null; } },
  set(store: Storage, key: string, value: string) { try { store.setItem(key, value); } catch { /* storage unavailable */ } },
};

function readQueue(): QueueItem[] {
  try {
    const raw = JSON.parse(storage.get(sessionStorage, QUEUE_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter(x => x && typeof x.key === 'string' && Array.isArray(x.options) && x.options.length) : [];
  } catch {
    return [];
  }
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

function matches(p: Product, q: string) {
  if ([p.name, p.sku, p.barcode, p.brand, p.categoryName].some(v => v?.toLowerCase().includes(q))) return true;
  return (p.units ?? []).some(u => u.barcode?.toLowerCase().includes(q));
}

// ── Template preview card ────────────────────────────────────────────────────

function TemplateCard({ t, selected, companyName, currencyCode, busy, onUse, onEdit, onDuplicate, onDelete, onSetDefault }: {
  t: LabelTemplate; selected: boolean; companyName: string; currencyCode: ReturnType<typeof useCurrency>['currencyCode']; busy: boolean;
  onUse: () => void; onEdit: () => void; onDuplicate?: () => void; onDelete?: () => void; onSetDefault?: () => void;
}) {
  const wPx = (t.width * 96) / 25.4;
  const hPx = (t.height * 96) / 25.4;
  const zoom = Math.min(1.8, 250 / wPx, 130 / hPx);
  const format = t.format === 'AUTO' ? 'Auto code' : FORMAT_OPTIONS.find(f => f.value === t.format)?.label ?? t.format;
  return (
    <div className={cx(styles.tCard, selected && styles.tCardSelected)}>
      <div className={styles.tPreview}>
        <div className={styles.stageLabel} style={{ zoom } as React.CSSProperties}>
          <LabelView settings={t} data={sampleLabelData(t.format)} companyName={companyName} currencyCode={currencyCode} outline />
        </div>
      </div>
      <div className={styles.tBody}>
        <div style={{ minWidth: 0 }}>
          <h3 className={styles.tName} title={t.name}>{t.name}</h3>
          <p className={styles.tDesc} title={t.description}>{t.description || (t.builtIn ? 'Built-in layout' : 'Custom label layout')}</p>
        </div>
        <div className={styles.pills}>
          {selected && <span className={cx(pi.pill, pi.pillGreen)}><Check size={11} /> In use</span>}
          {t.isDefault && <span className={cx(pi.pill, pi.pillPrimary)}><Star size={11} /> Default</span>}
          <span className={cx(pi.pill, pi.pillGray)}>{sizeLabel(t)}</span>
          <span className={cx(pi.pill, pi.pillGray)}>{layoutLabel(t)}</span>
          <span className={cx(pi.pill, pi.pillGray)}>{t.fields.qr ? 'QR code' : format}</span>
        </div>
        <div className={styles.tActions}>
          <Button size="sm" variant={selected ? 'outline' : 'default'} onClick={onUse}>
            {selected ? <><Printer className="h-4 w-4" /> Print labels</> : <><Check className="h-4 w-4" /> Use template</>}
          </Button>
          {t.builtIn ? (
            <Button size="sm" variant="outline" onClick={onEdit} title="Customize a copy"><Edit className="h-4 w-4" /> Customize</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onEdit} title="Edit" aria-label="Edit"><Edit className="h-4 w-4" /></Button>
          )}
          {onDuplicate && (
            <Button size="sm" variant="outline" title="Duplicate" aria-label="Duplicate" disabled={busy} onClick={onDuplicate}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="outline" title="Delete" aria-label="Delete" disabled={busy} onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          )}
        </div>
        {onSetDefault && !t.isDefault && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={onSetDefault} style={{ alignSelf: 'flex-start' }}>
            <Star className="h-4 w-4" /> Set as default
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function BarcodePrint() {
  const { currencyCode } = useCurrency();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('print');

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [saved, setSaved] = useState<LabelTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');

  // Print queue
  const [queue, setQueue] = useState<QueueItem[]>(readQueue);
  const [selectedKey, setSelectedKey] = useState<string>(() => storage.get(localStorage, TEMPLATE_KEY) || BUILT_IN_TEMPLATES[0].key);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [printing, setPrinting] = useState(false);

  // Search
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [active, setActive] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dialogs
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<LabelTemplate | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // ── Loading ────────────────────────────────────────────────────────────────

  const loadTemplates = useCallback(async (select?: string) => {
    setTemplatesLoading(true);
    try {
      const list = (await printTemplateService.getTemplates('BARCODE_LABEL')).map(templateFromSaved)
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));
      setSaved(list);
      if (select) setSelectedKey(select);
      return list;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load label templates');
      return [];
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    // The saved default is what a fresh visit prints with; otherwise the last layout used.
    loadTemplates().then(list => {
      const def = list.find(t => t.isDefault);
      if (def) setSelectedKey(def.key);
    });
    productsService.getProducts({ size: 500 })
      .then(r => setProducts(r.products ?? []))
      .catch((err: any) => toast.error(err?.message || 'Failed to load products'))
      .finally(() => setProductsLoading(false));
  }, [loadTemplates]);

  useEffect(() => {
    const read = () => getCompanyDetails().then(c => setCompanyName(c.name)).catch(() => undefined);
    read();
    window.addEventListener('branchChanged', read);
    return () => window.removeEventListener('branchChanged', read);
  }, []);

  useEffect(() => { storage.set(sessionStorage, QUEUE_KEY, JSON.stringify(queue)); }, [queue]);
  useEffect(() => { storage.set(localStorage, TEMPLATE_KEY, selectedKey); }, [selectedKey]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // ── Templates ──────────────────────────────────────────────────────────────

  const allTemplates = useMemo(() => [...saved, ...BUILT_IN_TEMPLATES], [saved]);
  const template = allTemplates.find(t => t.key === selectedKey) ?? saved.find(t => t.isDefault) ?? BUILT_IN_TEMPLATES[0];
  const metrics = sheetMetrics(template);
  const defaultTemplate = saved.find(t => t.isDefault);

  // ── Queue ──────────────────────────────────────────────────────────────────

  const addItems = useCallback((items: QueueItem[]) => {
    setQueue(prev => {
      const next = [...prev];
      items.forEach(item => {
        const i = next.findIndex(x => x.key === item.key);
        if (i >= 0) next[i] = { ...next[i], qty: Math.min(MAX_LABELS_PER_ROW, next[i].qty + item.qty) };
        else next.push(item);
      });
      return next;
    });
  }, []);

  const addProduct = (p: Product) => {
    const item = queueItemFor(p);
    if (!item) { toast.error(`${p.name} has no barcode or SKU to print`, { description: 'Add a barcode on the product first.' }); return; }
    addItems([item]);
    setPreviewKey(item.key);
    setSearch('');
    setActive(0);
    toast.success(`Added ${p.name}`, { description: item.options[0].source === 'sku' ? 'No barcode set — the SKU will be printed as the barcode.' : undefined });
    inputRef.current?.focus();
  };

  const updateItem = (key: string, patch: Partial<QueueItem>) => setQueue(prev => prev.map(x => (x.key === key ? { ...x, ...patch } : x)));
  const setQty = (key: string, qty: number) => updateItem(key, { qty: Math.min(MAX_LABELS_PER_ROW, Math.max(1, Math.round(qty) || 1)) });
  const removeItem = (key: string) => setQueue(prev => prev.filter(x => x.key !== key));

  const onBillLoaded = useCallback((billNumber: string, r: BillLoadResult) => {
    addItems(r.items);
    setPreviewKey(r.items[0]?.key ?? null);
    toast.success(`Added ${plural(r.labels, 'label')} from ${billNumber}`, {
      description: r.skipped.length ? `Skipped ${r.skipped.length} line${r.skipped.length === 1 ? '' : 's'} without a barcode or SKU: ${r.skipped.slice(0, 3).join(', ')}${r.skipped.length > 3 ? '…' : ''}` : undefined,
    });
  }, [addItems]);

  // Queue pre-filled by another screen (Products, Purchase Invoices).
  const request = (location.state as { barcodePrint?: BarcodePrintRequest } | null)?.barcodePrint;
  const handledRequest = useRef<BarcodePrintRequest | null>(null);
  useEffect(() => {
    if (!request || productsLoading || handledRequest.current === request) return;
    handledRequest.current = request;
    navigate(location.pathname, { replace: true, state: null });
    setTab('print');
    const byId = new Map(products.map(p => [p.id, p]));
    if (request.productIds?.length) {
      const picked = request.productIds.map(id => byId.get(id)).filter((p): p is Product => !!p);
      const items = picked.map(p => queueItemFor(p)).filter((x): x is QueueItem => !!x);
      if (items.length) {
        addItems(items);
        setPreviewKey(items[0].key);
        const missing = request.productIds.length - items.length;
        toast.success(`Added ${plural(items.length, 'product')} to the print queue`, {
          description: missing > 0 ? `${plural(missing, 'product')} skipped — no barcode or SKU.` : undefined,
        });
      } else {
        toast.error('None of those products have a barcode or SKU to print');
      }
    }
    if (request.billId != null) {
      supplierBillService.getBillById(request.billId)
        .then(bill => {
          const r = queueItemsFromBill(bill, byId);
          if (r.items.length) onBillLoaded(bill.billNumber, r);
          else toast.error(`Nothing to print on ${bill.billNumber}`, { description: 'None of its lines are catalog products with a barcode or SKU.' });
        })
        .catch((err: any) => toast.error(err?.message || 'Failed to load the purchase invoice'));
    }
  }, [request, productsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalLabels = queue.reduce((n, x) => n + x.qty, 0);
  const startSkip = template.layout === 'SHEET' ? Math.min(skip, metrics.perPage - 1) : 0;
  const pages = totalLabels === 0 ? 0 : Math.ceil((totalLabels + startSkip) / metrics.perPage);
  const previewItem = queue.find(x => x.key === previewKey) ?? queue[0];
  const previewData = previewItem ? labelDataOf(previewItem) : sampleLabelData(template.format);
  const warnings = useMemo(() => labelWarnings(template, previewData), [template, previewData]);
  const skuCount = queue.filter(x => labelDataOf(x).source === 'sku').length;

  // ── Search ─────────────────────────────────────────────────────────────────

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products.filter(p => matches(p, q)).slice(0, 12);
  }, [products, search]);

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSearchOpen(true); setActive(a => Math.min(suggestions.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Escape') setSearchOpen(false);
    else if (e.key === 'Enter') {
      e.preventDefault();
      const q = search.trim().toLowerCase();
      if (!q) return;
      // A scanned barcode or typed SKU is added straight away.
      const exact = products.find(p => p.barcode?.toLowerCase() === q || p.sku?.toLowerCase() === q || (p.units ?? []).some(u => u.barcode?.toLowerCase() === q));
      const pick = exact ?? suggestions[active];
      if (pick) addProduct(pick);
      else toast.error(`No product matches “${search.trim()}”`);
    }
  };

  // ── Printing ───────────────────────────────────────────────────────────────

  const print = async () => {
    if (queue.length === 0) { toast.error('Add products to the print queue first'); return; }
    setPrinting(true);
    try {
      const n = await printLabels({ settings: template, items: queue, companyName, currencyCode, skip: startSkip, title: `Barcode labels · ${template.name}` });
      toast.success(`${plural(n, 'label')} sent to the print dialog`, { description: `${template.name} · ${plural(pages, template.layout === 'SHEET' ? 'sheet' : 'page')}` });
    } catch (err) {
      console.error('Barcode print failed', err);
      toast.error('Failed to open the print dialog');
    } finally {
      setPrinting(false);
    }
  };

  // ── Template actions ───────────────────────────────────────────────────────

  const openNew = () => setEditing({ template: null, name: `Label Template ${saved.length + 1}`, settings: normalizeSettings({ ...template, description: '' }), basedOn: template.name });
  const openEdit = (t: LabelTemplate) => (t.builtIn
    ? setEditing({ template: null, basedOn: t.name, name: `${t.name} (Custom)`, settings: normalizeSettings(t) })
    : setEditing({ template: t, name: t.name, settings: normalizeSettings(t) }));

  const saveTemplate = async (name: string, settings: LabelSettings, makeDefault: boolean) => {
    if (!editing) return;
    setSavingTemplate(true);
    const body = { category: 'BARCODE_LABEL' as const, name, paperSize: 'A4', settings: settings as unknown as Record<string, unknown> };
    try {
      let id: number;
      if (editing.template?.id != null) {
        id = editing.template.id;
        await printTemplateService.updateTemplate(id, body);
        if (makeDefault && !editing.template.isDefault) await printTemplateService.setDefault(id);
      } else {
        id = (await printTemplateService.createTemplate({ ...body, isDefault: makeDefault })).id;
      }
      toast.success(`${name} saved`, { description: 'Selected for printing.' });
      setEditing(null);
      await loadTemplates(`saved:${id}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const duplicate = async (t: LabelTemplate) => {
    if (t.id == null) return;
    setBusyId(t.id);
    try {
      const name = `${t.name} (Copy)`;
      await printTemplateService.createTemplate({ category: 'BARCODE_LABEL', name, paperSize: 'A4', isDefault: false, settings: normalizeSettings(t) as unknown as Record<string, unknown> });
      toast.success('Template duplicated');
      await loadTemplates();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to duplicate template');
    } finally {
      setBusyId(null);
    }
  };

  const setDefault = async (t: LabelTemplate) => {
    if (t.id == null) return;
    setBusyId(t.id);
    try {
      await printTemplateService.setDefault(t.id);
      toast.success(`${t.name} is now the default`, { description: 'It is pre-selected whenever labels are printed.' });
      await loadTemplates();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to set default template');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    const t = deleting;
    setDeleting(null);
    if (!t?.id) return;
    setBusyId(t.id);
    try {
      await printTemplateService.deleteTemplate(t.id);
      toast.success('Template deleted');
      if (selectedKey === t.key) setSelectedKey(BUILT_IN_TEMPLATES[0].key);
      await loadTemplates();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete template');
    } finally {
      setBusyId(null);
    }
  };

  const applyTemplate = (t: LabelTemplate) => {
    setSelectedKey(t.key);
    setTab('print');
    toast.success(`Printing with ${t.name}`);
  };

  if (editing) {
    return (
      <BarcodeTemplateDesigner
        initialName={editing.name}
        initial={editing.settings}
        basedOn={editing.basedOn}
        initialDefault={editing.template ? editing.template.isDefault : saved.length === 0}
        canBeDefault
        companyName={companyName}
        currencyCode={currencyCode}
        saving={savingTemplate}
        onClose={() => setEditing(null)}
        onSave={saveTemplate}
      />
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const previewZoom = Math.min(2.2, 330 / ((template.width * 96) / 25.4), 190 / ((template.height * 96) / 25.4));

  return (
    <div className={pi.page}>
      <ModuleHeader
        title="Barcode Print"
        icon={ScanBarcode}
        subtitle="Design label templates and print barcode labels for products and newly received stock"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setPurchaseOpen(true)} disabled={productsLoading}>
              <ShoppingBag className="h-4 w-4" /> Load from Purchase
            </Button>
            <Button variant="outline" size="sm" onClick={openNew}><Plus className="h-4 w-4" /> New Template</Button>
            <Button size="sm" onClick={print} disabled={queue.length === 0 || printing}>
              {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {totalLabels ? `Print ${plural(totalLabels, 'Label')}` : 'Print Labels'}
            </Button>
          </>
        }
        tabs={[
          { key: 'print', label: 'Print Labels', icon: Printer, active: tab === 'print', onClick: () => setTab('print') },
          { key: 'templates', label: 'Label Templates', icon: LayoutGrid, active: tab === 'templates', onClick: () => setTab('templates') },
        ]}
      />

      {tab === 'print' && (
        <div className={pi.fadeIn} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className={pi.kpiGrid}>
            <StatCard title="Products in Queue" icon={PackageOpen} tone="blue" loading={false}
              value={queue.length.toLocaleString()} sub={skuCount ? `${plural(skuCount, 'product')} using SKU as barcode` : queue.length ? 'All have a barcode' : 'Nothing queued yet'} />
            <StatCard title="Labels to Print" icon={Tags} tone="green" loading={false}
              value={totalLabels.toLocaleString()} sub={queue.length ? `Across ${plural(queue.length, 'product')}` : 'Add products or load a purchase'} />
            <StatCard title={template.layout === 'SHEET' ? 'A4 Sheets' : 'Roll Pages'} icon={FileStack} tone="purple" loading={false}
              value={pages.toLocaleString()} sub={template.layout === 'SHEET' ? `${metrics.perPage} labels per sheet` : `${plural(metrics.perPage, 'label')} per row`} />
            <StatCard title="Label Template" icon={Layers} tone="orange" loading={templatesLoading && saved.length === 0 && !template.builtIn}
              value={sizeLabel(template)} sub={template.name} />
          </div>

          <div className={styles.workspace}>
            <div className={styles.mainCol}>
              {/* ── Add products ── */}
              <section className={cx(pi.panel, pi.panelPad)} style={{ position: 'relative', zIndex: 5 }}>
                <div className={styles.panelHead}>
                  <div>
                    <h3 className={pi.panelTitle}><Search size={16} /> Add Products</h3>
                    <p className={styles.panelSub}>Search the catalog or scan a barcode — press Enter to add it to the queue.</p>
                  </div>
                </div>
                <div className={styles.searchRow}>
                  <div className={styles.searchWrap} ref={searchRef}>
                    <Search size={16} />
                    <input
                      ref={inputRef}
                      className={styles.searchInput}
                      placeholder={productsLoading ? 'Loading products…' : 'Product name, SKU, barcode or brand…'}
                      value={search}
                      disabled={productsLoading}
                      onChange={e => { setSearch(e.target.value); setSearchOpen(true); setActive(0); }}
                      onFocus={() => setSearchOpen(true)}
                      onKeyDown={onSearchKey}
                      aria-label="Search products"
                    />
                    <span className={styles.searchHint}><kbd className={pi.kbd}>Enter</kbd> to add</span>
                    {searchOpen && search.trim() && (
                      <div className={styles.suggest} role="listbox">
                        {suggestions.length === 0 && <div className={styles.suggestEmpty}>No products match “{search.trim()}”</div>}
                        {suggestions.map((p, i) => {
                          const opts = barcodeOptions(p);
                          const code = opts[0];
                          return (
                            <button key={p.id} type="button" role="option" aria-selected={i === active}
                              className={cx(styles.suggestItem, i === active && styles.suggestActive)}
                              disabled={!code} onMouseEnter={() => setActive(i)} onClick={() => addProduct(p)}>
                              <Thumb product={p} size={38} />
                              <span className={styles.itemText}>
                                <span className={styles.itemName} style={{ display: 'block' }}>{p.name}</span>
                                <span className={styles.itemSub}>
                                  {p.sku && <span>{p.sku}</span>}
                                  {code ? <span className={styles.code}>{code.value}</span> : <span>No barcode or SKU</span>}
                                  {opts.length > 1 && <span>+{opts.length - 1} more</span>}
                                  {code?.source === 'sku' && <span className={cx(pi.pill, pi.pillAmber)}>SKU as barcode</span>}
                                  {!p.isActive && <span className={cx(pi.pill, pi.pillGray)}>Inactive</span>}
                                </span>
                              </span>
                              <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}><CurrencyValue amount={p.sellingPrice} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} /></span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => setPurchaseOpen(true)} disabled={productsLoading} style={{ height: 44 }}>
                    <ShoppingBag className="h-4 w-4" /> From Purchase
                  </Button>
                </div>
              </section>

              {/* ── Queue ── */}
              <section className={cx(pi.panel, pi.panelPad)}>
                <div className={styles.panelHead}>
                  <div>
                    <h3 className={pi.panelTitle}>
                      <Tags size={16} /> Print Queue <span className={cx(pi.muted, pi.tiny)} style={{ fontWeight: 500 }}>({queue.length})</span>
                    </h3>
                    <p className={styles.panelSub}>Set how many labels each product needs. Click a row to preview it.</p>
                  </div>
                  {queue.length > 0 && (
                    <div className={styles.headActions}>
                      <Button variant="outline" size="sm" onClick={() => setQueue(q => q.map(x => ({ ...x, qty: 1 })))}><RotateCcw className="h-4 w-4" /> All to 1</Button>
                      <Button variant="outline" size="sm" onClick={() => setConfirmClear(true)}><Trash2 className="h-4 w-4 text-red-600" /> Clear</Button>
                    </div>
                  )}
                </div>

                {queue.length === 0 ? (
                  <div className={styles.queueEmpty}>
                    <span className={styles.queueEmptyIcon}><ScanBarcode size={28} /></span>
                    <strong>The print queue is empty</strong>
                    <span>Search for products above, or load everything received on a purchase invoice.</span>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <Button size="sm" onClick={() => inputRef.current?.focus()}><Search className="h-4 w-4" /> Search products</Button>
                      <Button size="sm" variant="outline" onClick={() => setPurchaseOpen(true)} disabled={productsLoading}><ShoppingBag className="h-4 w-4" /> Load from purchase</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={pi.tableWrap}>
                      <table className={styles.queueTable}>
                        <thead>
                          <tr>
                            <th className={pi.center} style={{ width: 52, paddingLeft: 20 }}>#</th>
                            <th>Product</th>
                            <th>Barcode</th>
                            <th className={pi.right}>Price</th>
                            <th className={pi.center} style={{ width: 150 }}>Labels</th>
                            <th style={{ width: 56, paddingRight: 20 }} />
                          </tr>
                        </thead>
                        <tbody>
                          {queue.map((item, idx) => {
                            const opt = item.options.find(o => o.id === item.optionId) ?? item.options[0];
                            const product = item.productId != null ? products.find(p => p.id === item.productId) : undefined;
                            return (
                              <tr key={item.key} className={cx(previewItem?.key === item.key && styles.queueActive)} onClick={() => setPreviewKey(item.key)} style={{ cursor: 'pointer' }}>
                                <td className={cx(pi.center, pi.muted, pi.mono)} style={{ paddingLeft: 20 }}>{idx + 1}</td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                    <Thumb product={product ?? { name: item.name, imageUrls: [] }} size={36} />
                                    <div style={{ minWidth: 0 }}>
                                      <div className={styles.itemName} style={{ maxWidth: 260 }} title={item.name}>{item.name}</div>
                                      <div className={styles.itemSub}>
                                        {item.sku && <span>{item.sku}</span>}
                                        {item.brand && <span>· {item.brand}</span>}
                                        {item.origin && <span className={cx(pi.pill, pi.pillPurple)}>{item.origin}</span>}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td onClick={e => e.stopPropagation()}>
                                  {item.options.length > 1 ? (
                                    <span className={styles.selectWrap}>
                                      <select className={styles.codeSelect} value={item.optionId} aria-label={`Barcode for ${item.name}`}
                                        onChange={e => { updateItem(item.key, { optionId: e.target.value }); setPreviewKey(item.key); }}>
                                        {item.options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                                      </select>
                                      <ChevronDown size={12} />
                                    </span>
                                  ) : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                      <span className={styles.code}>{opt.value}</span>
                                      {opt.unit && <span className={cx(pi.tiny, pi.muted)}>{opt.unit}</span>}
                                    </span>
                                  )}
                                  {opt.source === 'sku' && <div style={{ marginTop: 4 }}><span className={cx(pi.pill, pi.pillAmber)}>No barcode — printing SKU</span></div>}
                                </td>
                                <td className={cx(pi.right, pi.num)} style={{ fontWeight: 600 }}>
                                  {opt.price != null ? <CurrencyValue amount={opt.price} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} /> : '—'}
                                </td>
                                <td className={pi.center} onClick={e => e.stopPropagation()}>
                                  <span className={styles.stepper}>
                                    <button type="button" aria-label="One less" disabled={item.qty <= 1} onClick={() => setQty(item.key, item.qty - 1)}><Minus size={14} /></button>
                                    <input type="number" min={1} max={MAX_LABELS_PER_ROW} value={item.qty} aria-label={`Labels for ${item.name}`}
                                      onChange={e => setQty(item.key, Number(e.target.value))} onFocus={e => e.target.select()} />
                                    <button type="button" aria-label="One more" onClick={() => setQty(item.key, item.qty + 1)}><Plus size={14} /></button>
                                  </span>
                                </td>
                                <td style={{ paddingRight: 20 }} onClick={e => e.stopPropagation()}>
                                  <IconBtn title="Remove" tone={pi.iconBtnRed} onClick={() => removeItem(item.key)}><Trash2 size={15} /></IconBtn>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className={styles.queueFoot}>
                      <span><strong>{plural(queue.length, 'product')}</strong> · <strong>{plural(totalLabels, 'label')}</strong> · {plural(pages, template.layout === 'SHEET' ? 'A4 sheet' : 'roll page')}</span>
                      <span>Printing with <strong>{template.name}</strong></span>
                    </div>
                  </>
                )}
              </section>
            </div>

            {/* ── Rail ── */}
            <aside className={styles.rail}>
              <section className={styles.railPanel}>
                <div className={styles.railHead}>
                  <h3 className={pi.panelTitle}><Layers size={16} /> Label Template</h3>
                  <button type="button" className={cx(pi.tiny)} style={{ border: 0, background: 'none', color: 'var(--primary)', fontWeight: 500, cursor: 'pointer' }} onClick={() => setTab('templates')}>
                    Manage
                  </button>
                </div>
                <div className={styles.railBody}>
                  <div className={pi.selectWrap}>
                    <select className={styles.templateSelect} value={template.key} onChange={e => setSelectedKey(e.target.value)} aria-label="Label template">
                      {saved.length > 0 && (
                        <optgroup label="Your templates">
                          {saved.map(t => <option key={t.key} value={t.key}>{t.name}{t.isDefault ? ' (default)' : ''} — {sizeLabel(t)}</option>)}
                        </optgroup>
                      )}
                      <optgroup label="Built-in layouts">
                        {BUILT_IN_TEMPLATES.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
                      </optgroup>
                    </select>
                    <ChevronDown size={14} />
                  </div>
                  <div className={styles.facts}>
                    <div className={styles.fact}><span>Size</span><b>{sizeLabel(template)}</b></div>
                    <div className={styles.fact}><span>Media</span><b>{layoutLabel(template)}</b></div>
                    <div className={styles.fact}><span>Code</span><b>{template.fields.qr ? 'QR code' : FORMAT_OPTIONS.find(f => f.value === template.format)?.label.replace(' (from product)', '')}</b></div>
                  </div>
                </div>
              </section>

              <section className={styles.railPanel}>
                <div className={styles.railHead}>
                  <h3 className={pi.panelTitle}><ScanBarcode size={16} /> Label Preview</h3>
                  <span className={cx(pi.pill, pi.pillGray)}>{previewItem ? 'Actual data' : 'Sample'}</span>
                </div>
                <div className={styles.railBody}>
                  <div className={styles.stage}>
                    <div className={styles.stageLabel} style={{ zoom: previewZoom } as React.CSSProperties}>
                      <LabelView settings={template} data={previewData} companyName={companyName} currencyCode={currencyCode} outline />
                    </div>
                  </div>
                  <div className={styles.stageCaption}>
                    <span>{previewItem ? previewItem.name : 'Add a product to preview it'}</span>
                    {previewItem && <span>{plural(previewItem.qty, 'copy', 'copies')}</span>}
                  </div>
                  {warnings.map(w => <div key={w} className={styles.warn}><AlertTriangle size={15} /> {w}</div>)}
                </div>
              </section>

              <section className={styles.railPanel}>
                <div className={styles.railHead}>
                  <h3 className={pi.panelTitle}><Printer size={16} /> Print</h3>
                </div>
                <div className={styles.railBody}>
                  {template.layout === 'SHEET' && (
                    <div className={styles.printRow}>
                      <span>Start at label<small>Skip used spots on a partly used sheet</small></span>
                      <input type="number" className={styles.numInput} min={1} max={metrics.perPage} value={startSkip + 1}
                        onChange={e => setSkip(Math.max(0, Math.min(metrics.perPage - 1, (Number(e.target.value) || 1) - 1)))} aria-label="Start position" />
                    </div>
                  )}
                  <div className={styles.printRow}>
                    <span>Labels</span><b>{totalLabels.toLocaleString()}</b>
                  </div>
                  <div className={styles.printRow}>
                    <span>{template.layout === 'SHEET' ? 'A4 sheets' : 'Pages'}<small>{template.layout === 'SHEET' ? `${metrics.cols} × ${metrics.rows} per sheet` : `Paper size ${+metrics.pageW.toFixed(1)} × ${+metrics.pageH.toFixed(1)} mm`}</small></span>
                    <b>{pages.toLocaleString()}</b>
                  </div>
                  <Button className={styles.printBtn} onClick={print} disabled={queue.length === 0 || printing}>
                    {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                    {totalLabels ? `Print ${plural(totalLabels, 'label')}` : 'Print labels'}
                  </Button>
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <div className={pi.fadeIn} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className={pi.kpiGrid}>
            <StatCard title="Saved Templates" icon={Layers} tone="blue" loading={templatesLoading} value={saved.length} sub="Custom layouts for this gym" />
            <StatCard title="Built-in Layouts" icon={LayoutGrid} tone="purple" loading={false} value={BUILT_IN_TEMPLATES.length} sub="Ready to use or customize" />
            <StatCard title="Default Template" icon={Star} tone="green" loading={templatesLoading} value={defaultTemplate ? sizeLabel(defaultTemplate) : '—'} sub={defaultTemplate?.name ?? 'Using the last layout printed'} />
            <StatCard title="In Use Now" icon={Printer} tone="orange" loading={false} value={sizeLabel(template)} sub={template.name} />
          </div>

          <section className={cx(pi.panel, pi.panelPad)}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>
                <span className={styles.chip}><Layers size={20} /></span>
                <div>
                  <h2>Your Templates</h2>
                  <p>Layouts saved for your label stock — shared by every branch.</p>
                </div>
              </div>
              <Button onClick={openNew}><Plus className="h-4 w-4" /> New Template</Button>
            </div>
            {templatesLoading && saved.length === 0 ? (
              <div className={styles.cards}>{[0, 1, 2].map(i => <div key={i} className={pi.skeleton} style={{ height: 300, borderRadius: 12 }} />)}</div>
            ) : saved.length === 0 ? (
              <div className={styles.emptySaved}>
                <div>
                  <strong>No saved templates yet</strong>
                  <p>Start from a built-in layout below, or design one to match the exact size of your label rolls or sticker sheets.</p>
                </div>
                <Button variant="outline" onClick={openNew}><Edit className="h-4 w-4" /> Design a template</Button>
              </div>
            ) : (
              <div className={styles.cards}>
                {saved.map(t => (
                  <TemplateCard key={t.key} t={t} selected={t.key === template.key} companyName={companyName} currencyCode={currencyCode} busy={busyId === t.id}
                    onUse={() => applyTemplate(t)} onEdit={() => openEdit(t)} onDuplicate={() => duplicate(t)} onDelete={() => setDeleting(t)} onSetDefault={() => setDefault(t)} />
                ))}
              </div>
            )}
          </section>

          <section className={cx(pi.panel, pi.panelPad)}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>
                <span className={styles.chip}><LayoutGrid size={20} /></span>
                <div>
                  <h2>Built-in Layouts</h2>
                  <p>Common label roll and sticker sheet sizes. Customize one to save your own copy.</p>
                </div>
              </div>
            </div>
            <div className={styles.cards}>
              {BUILT_IN_TEMPLATES.map(t => (
                <TemplateCard key={t.key} t={t} selected={t.key === template.key} companyName={companyName} currencyCode={currencyCode} busy={false}
                  onUse={() => applyTemplate(t)} onEdit={() => openEdit(t)} />
              ))}
            </div>
          </section>
        </div>
      )}

      <LoadPurchaseDialog open={purchaseOpen} onOpenChange={setPurchaseOpen} products={products} onLoad={(bill, r) => onBillLoaded(bill.billNumber, r)} />

      <AlertDialog open={!!deleting} onOpenChange={o => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.name}” will be removed. This can’t be undone.{deleting?.isDefault ? ' Printing will fall back to the last layout used.' : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear the print queue?</AlertDialogTitle>
            <AlertDialogDescription>All {plural(queue.length, 'product')} ({plural(totalLabels, 'label')}) will be removed from the queue.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setQueue([]); setPreviewKey(null); setSkip(0); }} className="bg-red-600 hover:bg-red-700">Clear queue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
