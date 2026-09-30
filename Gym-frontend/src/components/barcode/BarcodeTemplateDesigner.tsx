import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowLeftRight, Barcode, Info, LayoutGrid, Loader2, Printer, Ruler, Save, ScanBarcode, SlidersHorizontal, Tags,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import type { CurrencyCode } from '../../utils/currency';
import {
  FIELD_META, FORMAT_OPTIONS, LabelView, MAX_SCALE, MIN_SCALE, labelWarnings, layoutLabel, normalizeSettings, printLabels,
  sampleLabelData, sheetMetrics, sizeLabel, type BarcodeFormat, type LabelFieldKey, type LabelSettings,
} from './barcodeLabels';
import pt from '../print-templates/PrintTemplates.module.css';
import styles from './BarcodePrint.module.css';

const MM_TO_PX = 96 / 25.4;

type TabId = 'size' | 'content' | 'barcode';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'size', label: 'Size', icon: Ruler },
  { id: 'content', label: 'Content', icon: Tags },
  { id: 'barcode', label: 'Barcode', icon: Barcode },
];

const SIZE_PRESETS: { w: number; h: number; use: string; patch?: Partial<LabelSettings> }[] = [
  { w: 38, h: 25, use: 'Small items' },
  { w: 50, h: 25, use: 'Shelf / price' },
  { w: 50, h: 30, use: 'Standard' },
  { w: 50, h: 50, use: 'Square · QR' },
  { w: 58, h: 40, use: 'Large' },
  { w: 70, h: 40, use: 'Boxes' },
  { w: 100, h: 50, use: 'Cartons' },
  { w: 100, h: 75, use: 'Shipping' },
  { w: 63.5, h: 38.1, use: 'A4 sheet · 21', patch: { layout: 'SHEET', marginTop: 15.1, marginLeft: 7.2, gapX: 2.5, gapY: 0 } },
];

const LONG_NAME = 'Optimum Nutrition Gold Standard 100% Whey Protein Isolate — Double Rich Chocolate 2lb';

function Group({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className={pt.group}>
      <h4 className={pt.groupTitle}><Icon size={14} /> {title}</h4>
      {children}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className={pt.row}>
      <span className={pt.rowLabel}>{label}{hint && <span className={pt.rowHint}>{hint}</span>}</span>
      {children}
    </div>
  );
}

function MmInput({ value, onChange, min, max, step = 0.5, label, prefix }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number; label: string; prefix?: string;
}) {
  // Keep the raw text while typing so "63." or an emptied field doesn't snap back mid-edit.
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  const commit = () => {
    const n = Number(text);
    if (!Number.isFinite(n) || text.trim() === '') { setText(String(value)); return; }
    const v = Math.min(max, Math.max(min, Math.round(n * 10) / 10));
    setText(String(v));
    if (v !== value) onChange(v);
  };
  return (
    <span className={styles.dimPair}>
      {prefix && <b className={styles.dimPrefix}>{prefix}</b>}
      <input type="number" className={pt.number} min={min} max={max} step={step} value={text} aria-label={label}
        onChange={e => setText(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); }} />
      mm
    </span>
  );
}

/** Scaled drawing of how labels sit on the roll row or the A4 sheet. */
function PageMap({ s }: { s: LabelSettings }) {
  const m = sheetMetrics(s);
  const scale = Math.min(230 / m.pageW, 230 / m.pageH, s.layout === 'ROLL' ? 3 : 1.2);
  const cells = [];
  for (let r = 0; r < m.rows; r++) {
    for (let c = 0; c < m.cols; c++) {
      cells.push(
        <span key={`${r}-${c}`} className={styles.pageMapCell} style={{
          left: (m.padLeft + c * (s.width + s.gapX)) * scale,
          top: (m.padTop + r * (s.height + (s.layout === 'SHEET' ? s.gapY : 0))) * scale,
          width: s.width * scale, height: s.height * scale,
        }} />,
      );
    }
  }
  return (
    <div className={styles.pageMapCard}>
      <span className={styles.pageMapTitle}>
        {s.layout === 'SHEET' ? `A4 sheet · ${m.cols} × ${m.rows} = ${m.perPage} labels per page` : `${layoutLabel(s)} · page ${+m.pageW.toFixed(1)} × ${+m.pageH.toFixed(1)}mm`}
      </span>
      <div className={styles.pageMap} style={{ width: m.pageW * scale, height: m.pageH * scale }}>{cells}</div>
    </div>
  );
}

export function BarcodeTemplateDesigner({ initialName, initial, basedOn, initialDefault, canBeDefault, companyName, currencyCode, saving, onClose, onSave }: {
  initialName: string;
  initial: LabelSettings;
  /** Name of the built-in layout this new template starts from. */
  basedOn?: string;
  initialDefault: boolean;
  canBeDefault: boolean;
  companyName: string;
  currencyCode: CurrencyCode;
  saving: boolean;
  onClose: () => void;
  onSave: (name: string, settings: LabelSettings, makeDefault: boolean) => void;
}) {
  const [name, setName] = useState(initialName);
  const [s, setS] = useState<LabelSettings>(initial);
  const [baseline] = useState(() => JSON.stringify({ n: initialName, s: initial }));
  const [makeDefault, setMakeDefault] = useState(initialDefault);
  const [tab, setTab] = useState<TabId>('size');
  const [longName, setLongName] = useState(false);
  const fitZoom = useMemo(() => Math.min(4, Math.max(1, Math.round(Math.min(420 / (s.width * MM_TO_PX), 320 / (s.height * MM_TO_PX)) * 4) / 4)), [s.width, s.height]);
  const [zoom, setZoom] = useState(fitZoom);
  const [confirmLeave, setConfirmLeave] = useState<null | (() => void)>(null);
  const dirty = JSON.stringify({ n: name, s }) !== baseline || makeDefault !== initialDefault;

  useEffect(() => { setZoom(fitZoom); }, [fitZoom]);

  const upd = (patch: Partial<LabelSettings>) => setS(p => normalizeSettings({ ...p, ...patch }));
  const setField = (k: LabelFieldKey, v: boolean) => setS(p => {
    const fields = { ...p.fields, [k]: v };
    if (k === 'barcode' && v) fields.qr = false;
    if (k === 'qr' && v) fields.barcode = false;
    return { ...p, fields };
  });

  const sample = useMemo(() => {
    const d = sampleLabelData(s.format);
    return longName ? { ...d, name: LONG_NAME } : d;
  }, [s.format, longName]);
  const preset = SIZE_PRESETS.find(p => p.w === s.width && p.h === s.height);
  const warnings = useMemo(() => labelWarnings(s, sample), [s, sample]);
  const m = sheetMetrics(s);
  const format = FORMAT_OPTIONS.find(f => f.value === s.format) ?? FORMAT_OPTIONS[0];
  const leave = (action: () => void) => (dirty ? setConfirmLeave(() => action) : action());

  const save = () => {
    if (!name.trim()) { toast.error('Template name is required'); setTab('size'); return; }
    if (!s.fields.barcode && !s.fields.qr) { toast.error('Turn on the barcode or the QR code — a label needs something to scan'); setTab('content'); return; }
    onSave(name.trim(), s, makeDefault);
  };

  // Ctrl/⌘+S saves instead of opening the browser's "Save page" dialog.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!saving) saveRef.current(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving]);

  const testPrint = () => {
    const d = sample;
    printLabels({
      settings: s, companyName, currencyCode, title: name || 'Test label',
      items: [{ key: 'sample', name: d.name, brand: d.brand, sku: d.sku, symbology: d.symbology, qty: s.layout === 'SHEET' ? 1 : s.columns, optionId: 'x', options: [{ id: 'x', label: '', unit: d.unit, value: d.value, price: d.price, source: 'barcode' }] }],
    }).catch(() => toast.error('Failed to open the print dialog'));
  };

  return (
    <div className={pt.designer}>
      {/* ── Top bar ── */}
      <div className={pt.topBar}>
        <div className={pt.topLeft}>
          <button type="button" className={pt.backBtn} onClick={() => leave(onClose)}>
            <ArrowLeft size={16} /> Back
          </button>
          <span className={pt.divider} />
          <span className={pt.docName}><ScanBarcode size={16} className="text-primary" /> {name || 'Untitled template'}</span>
          <span className={`${pt.pill} ${pt.pillPrimary}`}>{sizeLabel(s)}</span>
          <span className={pt.pill}>{layoutLabel(s)}</span>
          {basedOn && <span className={pt.pill}>Based on {basedOn}</span>}
          {dirty && <span className={pt.pill}>Unsaved changes</span>}
        </div>
        <div className={pt.topRight}>
          <div className={pt.zoom}>
            <button type="button" aria-label="Zoom out" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}>−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom(z => Math.min(5, +(z + 0.25).toFixed(2)))}>+</button>
            <button type="button" className={styles.zoomFit} style={{ width: 'auto', padding: '0 8px' }} disabled={zoom === fitZoom} onClick={() => setZoom(fitZoom)} title="Fit the label to the screen">Fit</button>
          </div>
          {canBeDefault && (
            <label className={pt.defaultSwitch} title={initialDefault ? 'This is the default — set another template as default to change it' : 'Pre-selected whenever labels are printed'}>
              <Switch checked={makeDefault} disabled={initialDefault} onCheckedChange={setMakeDefault} aria-label="Use as default" />
              Default template
            </label>
          )}
          <Button variant="outline" onClick={testPrint}><Printer className="h-4 w-4" /> Test print</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save template
          </Button>
        </div>
      </div>

      <div className={pt.body}>
        {/* ── Settings panel ── */}
        <aside className={pt.side}>
          <div className={pt.sideTop}>
            <label className={styles.field}>
              <span>Template name</span>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Shelf label 50×25" />
            </label>
            <label className={styles.field}>
              <span>Description <i>optional</i></span>
              <Input value={s.description} onChange={e => upd({ description: e.target.value })} placeholder="Where these labels are used" />
            </label>
            <div className={pt.tabGrid}>
              {TABS.map(t => (
                <button key={t.id} type="button" className={`${pt.tabBtn} ${tab === t.id ? pt.tabBtnActive : ''}`} onClick={() => setTab(t.id)}>
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className={pt.sideScroll}>
            {tab === 'size' && <>
              <Group icon={Ruler} title="Label size">
                <div className={styles.sizeCards}>
                  {SIZE_PRESETS.map(p => {
                    const k = 26 / Math.max(p.w, p.h);
                    return (
                      <button key={`${p.w}x${p.h}`} type="button" aria-pressed={p === preset}
                        className={`${styles.sizeCard} ${p === preset ? styles.sizeCardOn : ''}`}
                        onClick={() => upd({ width: p.w, height: p.h, ...p.patch })}>
                        <span className={styles.sizeShape}><span style={{ width: p.w * k, height: p.h * k }} /></span>
                        <b>{p.w}×{p.h}</b>
                        <small>{p.use}</small>
                      </button>
                    );
                  })}
                </div>
                <div className={styles.customSize}>
                  <span className={styles.customSizeTitle}>
                    {preset ? 'Or enter a custom size' : <>Custom size <span className={styles.customBadge}>in use</span></>}
                  </span>
                  <div className={styles.whRow}>
                    <MmInput label="Label width" value={s.width} min={15} max={200} onChange={v => upd({ width: v })} prefix="W" />
                    <button type="button" className={styles.swapBtn} title="Swap width and height" aria-label="Swap width and height"
                      disabled={s.width === s.height || s.height < 15} onClick={() => upd({ width: s.height, height: s.width })}>
                      <ArrowLeftRight size={14} />
                    </button>
                    <MmInput label="Label height" value={s.height} min={10} max={150} onChange={v => upd({ height: v })} prefix="H" />
                  </div>
                </div>
              </Group>

              <Group icon={LayoutGrid} title="Media">
                <Row label="Printing on" hint={s.layout === 'SHEET' ? 'Sticker sheets on an office printer' : 'Label printer (Zebra, TSC, Xprinter…)'}>
                  <span className={styles.segmented}>
                    <button type="button" className={s.layout === 'ROLL' ? styles.segmentedOn : ''} onClick={() => upd({ layout: 'ROLL' })}>Roll</button>
                    <button type="button" className={s.layout === 'SHEET' ? styles.segmentedOn : ''} onClick={() => upd({ layout: 'SHEET' })}>A4 sheet</button>
                  </span>
                </Row>
                {s.layout === 'ROLL' ? <>
                  <Row label="Labels across" hint="For 2-up and 3-up rolls">
                    <select className={pt.select} style={{ minWidth: 90 }} value={s.columns} onChange={e => upd({ columns: Number(e.target.value) })}>
                      <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                    </select>
                  </Row>
                  {s.columns > 1 && <Row label="Gap between labels"><MmInput label="Column gap" value={s.gapX} min={0} max={20} onChange={v => upd({ gapX: v })} /></Row>}
                </> : <>
                  <Row label="Top margin"><MmInput label="Top margin" value={s.marginTop} min={0} max={40} onChange={v => upd({ marginTop: v })} /></Row>
                  <Row label="Left margin"><MmInput label="Left margin" value={s.marginLeft} min={0} max={40} onChange={v => upd({ marginLeft: v })} /></Row>
                  <Row label="Column gap"><MmInput label="Column gap" value={s.gapX} min={0} max={20} onChange={v => upd({ gapX: v })} /></Row>
                  <Row label="Row gap"><MmInput label="Row gap" value={s.gapY} min={0} max={20} onChange={v => upd({ gapY: v })} /></Row>
                  <div className={pt.note}>
                    <Info size={16} />
                    <span>Fits <b>{m.cols} × {m.rows} = {m.perPage}</b> labels per A4 sheet. Copy the margins and gaps from your sticker sheet’s box so every label lands inside its die-cut.</span>
                  </div>
                </>}
              </Group>
            </>}

            {tab === 'content' && <>
              <Group icon={Tags} title="Printed on the label">
                {FIELD_META.map(f => {
                  const disabled = f.key === 'barcodeText' && !s.fields.barcode && !s.fields.qr;
                  return (
                    <Row key={f.key} label={f.label} hint={f.hint}>
                      <Switch checked={s.fields[f.key]} disabled={disabled} onCheckedChange={v => setField(f.key, v)} aria-label={f.label} />
                    </Row>
                  );
                })}
              </Group>
              <Group icon={SlidersHorizontal} title="Text & code size">
                <Row label="Content size" hint="Scales text and the barcode together">
                  <span className={styles.dimPair}>
                    <input type="range" className={styles.range} min={MIN_SCALE} max={MAX_SCALE} step={0.05} value={s.contentScale}
                      onChange={e => upd({ contentScale: Number(e.target.value) })} aria-label="Content size" />
                    <b style={{ minWidth: 40, color: 'var(--foreground)' }}>{Math.round(s.contentScale * 100)}%</b>
                  </span>
                </Row>
              </Group>
            </>}

            {tab === 'barcode' && <>
              <Group icon={Barcode} title="Barcode type">
                <div className={pt.block}>
                  <label htmlFor="bc-format">Encode as</label>
                  <select id="bc-format" className={pt.select} style={{ width: '100%' }} value={s.format} onChange={e => upd({ format: e.target.value as BarcodeFormat })}>
                    {FORMAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <span className={pt.rowHint} style={{ marginTop: 6 }}>{format.hint}</span>
                </div>
                <div className={pt.note}>
                  <Info size={16} />
                  <span>A value that doesn’t fit the chosen type (for example a SKU on an EAN-13 template) is printed as Code 128, so no label is ever blank.</span>
                </div>
              </Group>
              <Group icon={Printer} title="Printing">
                <Row label="Cut guides" hint="Thin dashed outline around each label">
                  <Switch checked={s.outline} onCheckedChange={v => upd({ outline: v })} aria-label="Cut guides" />
                </Row>
                <div className={pt.note}>
                  <Info size={16} />
                  <span>
                    {s.layout === 'ROLL'
                      ? <>In the print dialog pick your label printer, set paper size to <b>{+m.pageW.toFixed(1)} × {+m.pageH.toFixed(1)} mm</b>, margins to <b>None</b> and scale to <b>100%</b>.</>
                      : <>In the print dialog choose <b>A4</b>, margins <b>None</b> and scale <b>100%</b> (not “Fit to page”) so labels line up with the sheet.</>}
                  </span>
                </div>
              </Group>
            </>}
          </div>
        </aside>

        {/* ── Live preview ── */}
        <div className={pt.canvas}>
          <div className={pt.canvasBar}>
            <span className={styles.previewWith}>
              <span>Preview with</span>
              <span className={styles.segmented}>
                <button type="button" className={!longName ? styles.segmentedOn : ''} onClick={() => setLongName(false)}>Sample product</button>
                <button type="button" className={longName ? styles.segmentedOn : ''} onClick={() => setLongName(true)}>Long name</button>
              </span>
            </span>
            <span className={pt.pills} style={{ marginTop: 0 }}>
              <span className={pt.pill}>Code: {format.label}</span>
              <span className={pt.pill}>Content {Math.round(s.contentScale * 100)}%</span>
            </span>
          </div>

          <div className={styles.canvasStage}>
            <div style={{ zoom } as React.CSSProperties}>
              <div className={styles.dimWrap}>
                <span className={styles.dimTop}>{+s.width.toFixed(1)} mm</span>
                <span className={styles.dimSide}>{+s.height.toFixed(1)} mm</span>
                <div className={styles.bigLabel}>
                  <LabelView settings={s} data={sample} companyName={companyName} currencyCode={currencyCode} outline={s.outline} />
                </div>
              </div>
            </div>
            {warnings.map(w => (
              <div key={w} className={styles.warn} style={{ maxWidth: 520, marginTop: -12 }}><AlertTriangle size={15} /> {w}</div>
            ))}
            {/* A 1-up roll page is just the label again — show printer setup there instead of a map. */}
            {s.layout === 'SHEET' || s.columns > 1 ? <PageMap s={s} /> : (
              <div className={styles.setupCard}>
                <span className={styles.pageMapTitle}><Printer size={15} /> Printer setup</span>
                <ul>
                  <li><span>Paper size</span><b>{+m.pageW.toFixed(1)} × {+m.pageH.toFixed(1)} mm</b></li>
                  <li><span>Margins</span><b>None</b></li>
                  <li><span>Scale</span><b>100%</b></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!confirmLeave} onOpenChange={o => { if (!o) setConfirmLeave(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>Your changes to “{name || 'this template'}” haven’t been saved.</AlertDialogDescription>
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
