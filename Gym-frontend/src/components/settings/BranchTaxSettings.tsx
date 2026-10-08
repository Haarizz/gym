import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Percent, Receipt, ShoppingCart, Truck, Info, BadgeCheck } from "lucide-react";
import { Switch } from "../ui/switch";
import { clearTaxDefaults } from "../../utils/supabase/tax-defaults-service";
import { invalidateCompanyDetailsCache } from "../../utils/company-details";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { financialSettingsService } from "../../utils/supabase/financial-settings-service";
import { SettingsSaveBar } from "./SettingsSaveBar";

/** Branch-scoped financial-settings category (see FinancialSettingService.BRANCH_SCOPED_CATEGORIES). */
const CATEGORY = "BRANCH_TAX";

const TAX_FIELDS = [
  {
    // Stored as the sales tax rate: the VAT charged on every sale of this branch.
    key: "default_sales_tax_rate",
    title: "Default VAT",
    description: "VAT rate on sales made by this branch.",
    icon: Receipt,
  },
  {
    key: "default_purchase_tax_rate",
    title: "Purchase Tax",
    description: "Default tax rate on purchases made by this branch.",
    icon: Truck,
  },
] as const;

type TaxKey = (typeof TAX_FIELDS)[number]["key"];
type TaxValues = Record<TaxKey, string>;

const EMPTY: TaxValues = { default_sales_tax_rate: "", default_purchase_tax_rate: "" };
/** VAT registration switch (BRANCH_TAX) and the TRN itself (COMPANY, shared with Company Details). */
const KEY_REGISTERED = "vat_registered";
const KEY_TRN = "company_trn";
const QUICK_RATES = ["0", "5", "10", "15"];
const EXAMPLE_AMOUNT = 1000;

function isValidRate(value: string): boolean {
  if (value.trim() === "") return true;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100;
}

interface BranchTaxSettingsProps {
  /** Re-fetch key — the backend resolves the branch from the active-branch header. */
  branchId: number;
  readOnly?: boolean;
}

/** Tax Configuration tab body: default VAT, sales tax and purchase tax rates for the active branch. */
export function BranchTaxSettings({ branchId, readOnly = false }: BranchTaxSettingsProps) {
  const [values, setValues] = useState<TaxValues>(EMPTY);
  const [saved, setSaved] = useState<TaxValues>(EMPTY);
  // Row ids, so a cleared rate can delete its row (settings can't hold blank values).
  const [rowIds, setRowIds] = useState<Partial<Record<TaxKey, number>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // TRN / VAT registration: only a registered branch charges VAT, sales tax and purchase tax.
  const [registered, setRegistered] = useState(true);
  const [savedRegistered, setSavedRegistered] = useState(true);
  const [trn, setTrn] = useState("");
  const [savedTrn, setSavedTrn] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, companyRows] = await Promise.all([
        financialSettingsService.getSettings(CATEGORY),
        financialSettingsService.getSettings("COMPANY").catch(() => []),
      ]);
      const next: TaxValues = { ...EMPTY };
      const ids: Partial<Record<TaxKey, number>> = {};
      let reg: boolean | null = null;
      rows.forEach((r) => {
        if (r.settingKey in next) {
          next[r.settingKey as TaxKey] = r.settingValue;
          ids[r.settingKey as TaxKey] = r.id;
        }
        if (r.settingKey === KEY_REGISTERED) reg = String(r.settingValue).toLowerCase() === "true";
      });
      const companyTrn = companyRows.find((r) => r.settingKey === KEY_TRN)?.settingValue?.trim() ?? "";
      // A branch that never set the switch keeps charging tax (as the server does) until it is switched off.
      const isRegistered = reg ?? true;
      setRegistered(isRegistered);
      setSavedRegistered(isRegistered);
      setTrn(companyTrn);
      setSavedTrn(companyTrn);
      setValues(next);
      setSaved(next);
      setRowIds(ids);
    } catch (err) {
      console.error("Failed to load tax configuration", err);
      toast.error("Failed to load tax configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [branchId, load]);

  const isDirty = registered !== savedRegistered || trn.trim() !== savedTrn
    || TAX_FIELDS.some(({ key }) => values[key] !== saved[key]);
  const hasErrors = TAX_FIELDS.some(({ key }) => !isValidRate(values[key]));

  const handleSave = async () => {
    if (registered && hasErrors) {
      toast.error("Tax rates must be between 0 and 100");
      return;
    }
    if (registered && trn.trim() === "") {
      toast.error("Enter the TRN to register this branch for VAT");
      return;
    }
    setSaving(true);
    try {
      if (registered !== savedRegistered) {
        await financialSettingsService.upsertSetting({
          settingKey: KEY_REGISTERED,
          settingValue: registered ? "true" : "false",
          category: CATEGORY,
          description: "VAT registered (TRN) — off: no tax on sales or purchases",
        });
      }
      if (registered && trn.trim() !== savedTrn) {
        await financialSettingsService.upsertSetting({
          settingKey: KEY_TRN,
          settingValue: trn.trim(),
          category: "COMPANY",
          description: "Tax Registration Number",
        });
      }
      if (registered) await Promise.all(
        TAX_FIELDS.filter(({ key }) => values[key] !== saved[key]).map(({ key, title }) => {
          const value = values[key].trim();
          if (value === "") {
            const id = rowIds[key];
            return id != null ? financialSettingsService.deleteSetting(id) : Promise.resolve();
          }
          return financialSettingsService.upsertSetting({
            settingKey: key,
            settingValue: String(Number(value)),
            category: CATEGORY,
            description: `${title} rate (%)`,
          });
        })
      );
      clearTaxDefaults();
      invalidateCompanyDetailsCache();
      toast.success("Tax configuration saved");
      await load();
    } catch (err: any) {
      console.error("Failed to save tax configuration", err);
      toast.error(err?.message || "Failed to save tax configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <fieldset disabled={readOnly} className="sp-panel">
      <Card className="border-0 shadow-sm">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <BadgeCheck className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">VAT registered (TRN)</div>
                <div className="text-sm text-gray-500">
                  {registered
                    ? "The Default VAT applies to every POS sale and sales invoice; the Purchase Tax to every purchase order and supplier bill."
                    : "Not registered: no VAT or purchase tax is charged on any sale or purchase, and receipts print without a TRN."}
                </div>
              </div>
            </div>
            <Switch checked={registered} onCheckedChange={setRegistered} aria-label="VAT registered" />
          </div>
          {registered && (
            <div className="space-y-1" style={{ maxWidth: 360 }}>
              <Label htmlFor="branch-trn">TRN (Tax Registration Number) *</Label>
              <Input id="branch-trn" value={trn} onChange={(e) => setTrn(e.target.value)} placeholder="e.g. 100123456700003" maxLength={30} />
              <p className="text-xs text-gray-500">Printed on tax invoices and receipts.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {registered && (<>
      <div className="sp-grid sp-grid--1-1 sp-stretch">
        {TAX_FIELDS.map(({ key, title, description, icon: Icon }) => {
          const value = values[key];
          const valid = isValidRate(value);
          const rate = valid && value.trim() !== "" ? Number(value) : null;
          return (
            <Card key={key} className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle>{title}</CardTitle>
                </div>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={key}>Rate</Label>
                  <div className="sp-rate-input">
                    <Input
                      id={key}
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      placeholder="Not set"
                      value={value}
                      aria-invalid={!valid}
                      onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                    />
                    <Percent className="sp-rate-suffix h-4 w-4" />
                  </div>
                  {!valid && <p className="text-xs text-red-600">Enter a rate between 0 and 100.</p>}
                </div>

                <div className="flex flex-wrap gap-2">
                  {QUICK_RATES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className="sp-chip"
                      data-active={value !== "" && Number(value) === Number(r)}
                      onClick={() => setValues((v) => ({ ...v, [key]: r }))}
                    >
                      {r}%
                    </button>
                  ))}
                </div>

                <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm">
                  {rate === null ? (
                    <span className="text-gray-500">No default rate set for this branch.</span>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-500">On {EXAMPLE_AMOUNT.toLocaleString()}.00</span>
                      <span className="font-medium text-gray-900">
                        tax {(EXAMPLE_AMOUNT * rate / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-2 text-sm text-gray-700">
        <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
        <span>
          These rates apply to this branch only: the Default VAT on every sale and the Purchase Tax on every purchase;
          a product set to its own tax rate overrides them. Leave a rate empty to clear it. Tax codes and filings are managed under Financials → Tax Compliance.
        </span>
      </div>
      </>)}

      <SettingsSaveBar
        isDirty={isDirty}
        saving={saving}
        onSave={handleSave}
        label="Save Tax Configuration"
        disabled={readOnly}
        note={readOnly ? "Read-only — select a branch from the sidebar to edit" : undefined}
      />
    </fieldset>
  );
}
