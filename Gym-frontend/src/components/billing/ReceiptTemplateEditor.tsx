import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Loader2, Palette, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useBranch } from "../../utils/branch-context";
import { useCurrency } from "../../utils/currency";
import { getCompanyDetails, type CompanyDetails } from "../../utils/company-details";
import { buildFullReceiptHtml, type ReceiptPrintData } from "../../utils/receipt-invoice";
import {
  DEFAULT_RECEIPT_COLORS,
  getReceiptColors,
  invalidateReceiptColors,
  saveReceiptColors,
  type ReceiptColors,
} from "../../utils/receipt-colors";

const HEX = /^#[0-9a-fA-F]{6}$/;

const FIELDS: { key: keyof ReceiptColors; label: string; hint: string }[] = [
  { key: "primary", label: "Brand colour", hint: "Company name, headings, table header, totals" },
  { key: "panel", label: "Panel background", hint: "Receipt info, bill-to and totals panels" },
  { key: "highlight", label: "Payment box background", hint: "Payment method / date / processed-by box" },
  { key: "highlightBorder", label: "Payment box accent", hint: "Left border of the payment box" },
];

// Quick starting points; every colour can still be fine-tuned with the picker
const PRESETS: { name: string; colors: ReceiptColors }[] = [
  { name: "GymBios Teal", colors: DEFAULT_RECEIPT_COLORS },
  { name: "Ocean Blue", colors: { primary: "#1d4ed8", panel: "#f1f5ff", highlight: "#e0f2fe", highlightBorder: "#0284c7" } },
  { name: "Royal Purple", colors: { primary: "#6d28d9", panel: "#f7f5ff", highlight: "#f3e8ff", highlightBorder: "#a855f7" } },
  { name: "Crimson", colors: { primary: "#b91c1c", panel: "#fff7f7", highlight: "#ffe4e6", highlightBorder: "#e11d48" } },
  { name: "Forest", colors: { primary: "#166534", panel: "#f4fbf6", highlight: "#ecfccb", highlightBorder: "#65a30d" } },
  { name: "Charcoal", colors: { primary: "#1f2937", panel: "#f8fafc", highlight: "#f1f5f9", highlightBorder: "#64748b" } },
];

/** Sample receipt used only for the live preview */
function sampleData(currencyCode: string): ReceiptPrintData {
  const total = 525;
  const vat = 25;
  return {
    receiptNo: "RCPT-0000000001",
    invoiceNo: "INV-2026-00001",
    dateStr: "01 October 2026",
    status: "Paid",
    billTo: { name: "Sample Member", memberId: "MBR-0000000001", phone: "+971 50 000 0000" },
    items: [{ description: "Monthly Membership", subtitle: "Transaction Type: Renewal", type: "Renewal", amount: total }],
    currencyCode,
    subtotalExclVat: total - vat,
    vatRatePercent: 5,
    vatAmount: vat,
    invoiceAmount: total,
    totalPaid: total,
    paymentMethod: "Cash",
    transactionDate: "01 October 2026",
    processedBy: "Admin",
    validity: { from: "01 Oct 2026", to: "31 Oct 2026" },
  };
}

/**
 * Billing → Edit Template: pick the colours of the printed member receipt for the
 * active branch. Only colours are customisable; layout and content stay fixed.
 */
export function ReceiptTemplateEditor({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { activeBranchName, isAllBranches } = useBranch();
  const { currencyCode } = useCurrency();
  const [colors, setColors] = useState<ReceiptColors>(DEFAULT_RECEIPT_COLORS);
  const [hexDraft, setHexDraft] = useState<ReceiptColors>(DEFAULT_RECEIPT_COLORS);
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    invalidateReceiptColors(); // always show what's saved for the branch now active
    Promise.all([getReceiptColors(), getCompanyDetails()])
      .then(([c, comp]) => {
        if (cancelled) return;
        setColors(c);
        setHexDraft(c);
        setCompany(comp);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  const setColor = (key: keyof ReceiptColors, value: string) => {
    setHexDraft((d) => ({ ...d, [key]: value }));
    if (HEX.test(value)) setColors((c) => ({ ...c, [key]: value.toLowerCase() }));
  };

  const applyPreset = (p: ReceiptColors) => {
    setColors(p);
    setHexDraft(p);
  };

  // The printable template auto-prints on load; strip its scripts so the preview only displays
  const previewHtml = useMemo(
    () => (company
      ? buildFullReceiptHtml(sampleData(currencyCode), company, colors).replace(/<script[\s\S]*?<\/script>/gi, "")
      : ""),
    [company, colors, currencyCode],
  );

  const invalidHex = FIELDS.some((f) => !HEX.test(hexDraft[f.key]));

  const save = async () => {
    if (invalidHex) {
      toast.error("Use 6-digit hex colours, e.g. #327F74");
      return;
    }
    setSaving(true);
    try {
      await saveReceiptColors(colors);
      toast.success("Receipt template saved", { description: `New receipts for ${activeBranchName} will print in these colours.` });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Could not save the template", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Explicit flex layout: header and footer stay put, only the body scrolls.
        // (% heights, not vh — the app's body zoom skews vh units.)
        style={{
          maxWidth: "min(1100px, calc(100% - 2rem))",
          width: "min(1100px, calc(100% - 2rem))",
          maxHeight: "92%",
          padding: 0,
          gap: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div className="border-b" style={{ padding: "22px 56px 18px 24px", flexShrink: 0 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Edit Receipt Template
            </DialogTitle>
            <DialogDescription>
              Colours for printed member receipts in <strong>{activeBranchName}</strong>. Each branch keeps its own colours.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5" style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden", gap: 0 }}>
          {/* Controls */}
          <div className="lg:col-span-2 space-y-5 overflow-y-auto border-r" style={{ padding: 24, minHeight: 0 }}>
            {isAllBranches && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Select a branch in the sidebar to save colours — each branch has its own receipt template.</span>
              </div>
            )}

            <div>
              <Label className="mb-2 block">Presets</Label>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => {
                  const active = FIELDS.every((f) => p.colors[f.key].toLowerCase() === colors[f.key].toLowerCase());
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => applyPreset(p.colors)}
                      className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm hover:bg-muted/50"
                      style={active ? { borderColor: p.colors.primary, boxShadow: `0 0 0 1px ${p.colors.primary}` } : undefined}
                    >
                      <span className="flex shrink-0 overflow-hidden rounded" style={{ width: 28, height: 18 }}>
                        <span style={{ flex: 2, background: p.colors.primary }} />
                        <span style={{ flex: 1, background: p.colors.highlight }} />
                      </span>
                      <span className="truncate">{p.name}</span>
                      {active && <Check className="h-3.5 w-3.5 ml-auto shrink-0" style={{ color: p.colors.primary }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {FIELDS.map((f) => {
                const valid = HEX.test(hexDraft[f.key]);
                return (
                  <div key={f.key}>
                    <Label htmlFor={`rc-${f.key}`} className="mb-1 block">{f.label}</Label>
                    <p className="text-xs text-muted-foreground mb-2">{f.hint}</p>
                    <div className="flex items-center gap-2">
                      {/* Native colour input: opens the system colour wheel / picker */}
                      <input
                        type="color"
                        aria-label={`${f.label} picker`}
                        value={colors[f.key]}
                        onChange={(e) => setColor(f.key, e.target.value)}
                        className="cursor-pointer rounded border"
                        style={{ width: 44, height: 36, padding: 2, background: "#fff" }}
                      />
                      <Input
                        id={`rc-${f.key}`}
                        value={hexDraft[f.key]}
                        onChange={(e) => setColor(f.key, e.target.value.trim())}
                        maxLength={7}
                        className="font-mono"
                        aria-invalid={!valid || undefined}
                        style={{ maxWidth: 140 }}
                      />
                      {!valid && <span className="text-xs" style={{ color: "var(--destructive)" }}>Use #RRGGBB</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live preview */}
          <div className="lg:col-span-3 bg-gray-100 overflow-auto" style={{ padding: 16, minHeight: 0 }}>
            <p className="text-xs text-muted-foreground mb-2">Live preview (sample data)</p>
            {loading || !company ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <div style={{ width: "100%", overflow: "hidden" }}>
                {/* The receipt is A4-sized; scale it down to fit the panel */}
                <iframe
                  title="Receipt preview"
                  srcDoc={previewHtml}
                  sandbox="allow-same-origin"
                  style={{ width: 860, height: 1180, border: 0, transform: "scale(0.62)", transformOrigin: "top left", marginBottom: -440, marginRight: -320, background: "#fff" }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t bg-white" style={{ padding: "14px 24px", flexShrink: 0 }}>
          <Button variant="ghost" onClick={() => applyPreset(DEFAULT_RECEIPT_COLORS)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || loading || isAllBranches || invalidHex}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Save Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
