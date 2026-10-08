import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { financialSettingsService } from "../utils/supabase/financial-settings-service";
import { invalidateCompanyDetailsCache } from "../utils/company-details";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  Settings as SettingsIcon, Coins, Check, Building, MapPin, Mail, Phone, UploadCloud, Building2, Image as ImageIcon, Hash, MapPinned, Stamp,
  AlertTriangle, LayoutDashboard, Receipt, CreditCard, BarChart3, Percent,
} from "lucide-react";
import { useCurrency, CURRENCIES, CurrencyCode, CurrencyGlyph } from "../utils/currency";
import { useBranch } from "../utils/branch-context";
import { toast } from "sonner";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { BranchSettingsTab, BRANCH_SETTINGS_TAB } from "./branch-settings";
import { SettingsSaveBar } from "../components/settings/SettingsSaveBar";
import { BranchTaxSettings } from "../components/settings/BranchTaxSettings";
import "../styles/settings-page.css";

const SETTINGS_TABS = ["currency", "company", BRANCH_SETTINGS_TAB, "tax"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

const CURRENCY_USAGES = [
  { icon: LayoutDashboard, label: "Dashboards" },
  { icon: Receipt, label: "Invoices & receipts" },
  { icon: CreditCard, label: "Billing & payments" },
  { icon: BarChart3, label: "Reports" },
];

export function AppSettings() {
  const { currencyCode, currency, setCurrencyCode, saving } = useCurrency();
  const { activeBranchId, activeBranchName, isAllBranches, accessibleBranches } = useBranch();
  const defaultBranch = accessibleBranches.find((b) => b.isDefault) ?? accessibleBranches[0];
  const defaultBranchName = defaultBranch?.branchName ?? "the default branch";
  // Every tab is branch-scoped. In "All Branches" mode the default branch is shown read-only.
  const settingsBranchId = activeBranchId ?? defaultBranch?.id ?? null;
  const settingsBranchName = isAllBranches ? defaultBranchName : activeBranchName;

  // Active tab lives in the URL (?tab=company) so other pages can deep-link to it.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: SettingsTab = SETTINGS_TABS.includes(tabParam as SettingsTab) ? (tabParam as SettingsTab) : "currency";
  const handleTabChange = (tab: string) => {
    setSearchParams(tab === "currency" ? {} : { tab }, { replace: true });
  };
  const [pendingCode, setPendingCode] = useState<CurrencyCode>(currencyCode);

  // Currency + Company Details are branch-scoped — keep the pending currency
  // selector in sync whenever the underlying (branch-resolved) value changes,
  // e.g. after switching branches.
  useEffect(() => {
    setPendingCode(currencyCode);
  }, [currencyCode]);

  const isDirty = pendingCode !== currencyCode;

  async function handleSave() {
    if (!isDirty) return;
    try {
      await setCurrencyCode(pendingCode);
    } catch {
      // toast already shown by the currency context
    }
  }

  const [companyDetails, setCompanyDetails] = useState({
    name: "",
    address: "",
    email: "",
    phone: "",
    logoPreview: "",
    stampPreview: "",
    trn: ""
  });
  // Id of the saved company_stamp row, so removing the stamp can delete it (settings can't hold blank values).
  const [stampSettingId, setStampSettingId] = useState<number | null>(null);
  const [isCompanyLoading, setIsCompanyLoading] = useState(true);
  const [isCompanySaving, setIsCompanySaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await financialSettingsService.getSettings("COMPANY");
        const details = {
          name: "",
          address: "",
          email: "",
          phone: "",
          logoPreview: "",
          stampPreview: "",
          trn: ""
        };
        let stampId: number | null = null;
        settings.forEach(s => {
          if (s.settingKey === "company_name") details.name = s.settingValue;
          if (s.settingKey === "company_address") details.address = s.settingValue;
          if (s.settingKey === "company_email") details.email = s.settingValue;
          if (s.settingKey === "company_phone") details.phone = s.settingValue;
          if (s.settingKey === "company_logo") details.logoPreview = s.settingValue;
          if (s.settingKey === "company_stamp") { details.stampPreview = s.settingValue; stampId = s.id; }
          if (s.settingKey === "company_trn") details.trn = s.settingValue;
        });
        setCompanyDetails(details);
        setStampSettingId(stampId);
      } catch (err) {
        console.error("Failed to load company details", err);
      } finally {
        setIsCompanyLoading(false);
      }
    };
    setIsCompanyLoading(true);
    loadSettings();
    // Company Details is branch-scoped — re-fetch whenever the active branch changes.
  }, [activeBranchId]);

  const [isCompanyDirty, setIsCompanyDirty] = useState(false);

  const handleCompanyChange = (field: string, value: string) => {
    setCompanyDetails(prev => ({ ...prev, [field]: value }));
    setIsCompanyDirty(true);
  };

  // Phone Number accepts digits and common separators (+, -, spaces,
  // parentheses) only — strips letters/symbols as they're typed or pasted.
  const handlePhoneChange = (value: string) => {
    handleCompanyChange("phone", value.replace(/[^0-9+\-\s()]/g, ""));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (5MB = 5 * 1024 * 1024 bytes)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Company logo must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      handleCompanyChange("logoPreview", event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Company stamp must be less than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => handleCompanyChange("stampPreview", event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveCompany = async () => {
    setIsCompanySaving(true);
    try {
      const keys = [
        { key: "company_name", val: companyDetails.name },
        { key: "company_address", val: companyDetails.address },
        { key: "company_email", val: companyDetails.email },
        { key: "company_phone", val: companyDetails.phone },
        { key: "company_logo", val: companyDetails.logoPreview },
        { key: "company_stamp", val: companyDetails.stampPreview },
      ].filter(k => k.val.trim() !== "");

      await Promise.all(keys.map(k =>
        financialSettingsService.upsertSetting({
          settingKey: k.key,
          settingValue: k.val,
          category: "COMPANY",
          description: `Company ${k.key.split('_')[1]}`
        })
      ));
      // A removed stamp can't be saved as blank — delete its row instead.
      if (!companyDetails.stampPreview && stampSettingId != null) {
        await financialSettingsService.deleteSetting(stampSettingId);
        setStampSettingId(null);
      }

      invalidateCompanyDetailsCache();
      setIsCompanyDirty(false);
      toast.success("Company details saved to database!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save company details.");
    } finally {
      setIsCompanySaving(false);
    }
  };

  const tabs = [
    { value: "currency", label: "Currency", hint: "How amounts are displayed", icon: Coins },
    { value: "company", label: "Company Details", hint: "Name, contact & logo", icon: Building },
    { value: BRANCH_SETTINGS_TAB, label: "Branch Settings", hint: "Profile, images & policies", icon: Building2 },
    { value: "tax", label: "Tax Configuration", hint: "Default VAT & purchase tax", icon: Percent },
  ] as const;
  const activeTabIndex = Math.max(tabs.findIndex((t) => t.value === activeTab), 0);

  const previewAmount = 1250;
  const previewTax = previewAmount * 0.05;

  return (
    <div className="sp-page">
      <div className="sp-header">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
            <p className="text-gray-600 mt-1">
              Everything here applies to <strong>{settingsBranchName}</strong> only — switch branches from the sidebar to configure another.
            </p>
          </div>
        </div>
        <div className="sp-branch-pill">
          <MapPinned className="h-4 w-4" />
          {settingsBranchName}
          {isAllBranches && <span className="text-xs font-normal text-gray-500">(read-only)</span>}
        </div>
      </div>

      {isAllBranches && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            Settings are per-branch. You're viewing <strong>{defaultBranchName}</strong>'s settings as a read-only reference — select a specific branch from the sidebar to edit.
          </span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="sp-tabs gap-6">
        <TabsList
          className="sp-tabs-list"
          style={{ "--sp-tab-count": tabs.length, "--sp-tab-index": activeTabIndex } as React.CSSProperties}
        >
          <span className="sp-tab-indicator" aria-hidden="true" />
          {tabs.map(({ value, label, hint, icon: Icon }) => (
            <TabsTrigger key={value} value={value}>
              <span className="sp-tab-icon">
                <Icon className="h-4 w-4" />
              </span>
              <span className="sp-tab-text">
                <span className="sp-tab-label">{label}</span>
                <span className="sp-tab-hint">{hint}</span>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Currency */}
        <TabsContent value="currency">
          <div className="sp-panel">
            <div className="sp-grid sp-grid--3-2 sp-stretch">
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-primary" />
                    <CardTitle>Display Currency</CardTitle>
                  </div>
                  <CardDescription>
                    The currency symbol and code used everywhere amounts are displayed in the app.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={pendingCode} onValueChange={(v) => setPendingCode(v as CurrencyCode)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            <span className="inline-flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-4">
                                <CurrencyGlyph code={c.code} />
                              </span>
                              {c.code} — {c.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!isDirty && (
                      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                        <Check className="h-4 w-4" />
                        Currently active ({currency.code})
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Applies to</p>
                    <div className="grid grid-cols-2 gap-3">
                      {CURRENCY_USAGES.map(({ icon: Icon, label }) => (
                        <div key={label} className="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-700">
                          <Icon className="h-4 w-4 text-primary" />
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>How amounts will look with the selected currency.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="sp-preview">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide opacity-80">Invoice total</p>
                      <p className="text-3xl font-bold mt-1 flex items-center gap-1.5">
                        <span className="inline-flex items-center">
                          <CurrencyGlyph code={pendingCode} />
                        </span>
                        {formatPreview(previewAmount + previewTax)}
                      </p>
                    </div>
                    <div>
                      <div className="sp-preview-row">
                        <span className="opacity-80">Monthly membership</span>
                        <span className="inline-flex items-center gap-1 font-medium">
                          <CurrencyGlyph code={pendingCode} />
                          {formatPreview(previewAmount)}
                        </span>
                      </div>
                      <div className="sp-preview-row">
                        <span className="opacity-80">Tax (5%)</span>
                        <span className="inline-flex items-center gap-1 font-medium">
                          <CurrencyGlyph code={pendingCode} />
                          {formatPreview(previewTax)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <SettingsSaveBar isDirty={isDirty} saving={saving} onSave={handleSave} label="Save Currency" />
          </div>
        </TabsContent>

        {/* Company Details */}
        <TabsContent value="company">
          <div className="sp-panel">
            <div className="sp-grid sp-grid--2-1 sp-stretch">
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle>Business Information</CardTitle>
                  </div>
                  <CardDescription>
                    These details may appear on invoices, reports, and the member portal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-500" />
                        Company Name
                      </Label>
                      <Input
                        id="companyName"
                        placeholder="Enter company name"
                        value={companyDetails.name}
                        onChange={(e) => handleCompanyChange("name", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contact@company.com"
                        value={companyDetails.email}
                        onChange={(e) => handleCompanyChange("email", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 234 567 890"
                        value={companyDetails.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2 sp-span-2">
                      <Label htmlFor="address" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        Address
                      </Label>
                      <Textarea
                        id="address"
                        placeholder="Enter complete company address"
                        rows={3}
                        value={companyDetails.address}
                        onChange={(e) => handleCompanyChange("address", e.target.value)}
                      />
                    </div>

                    <p className="text-xs text-gray-500 sp-span-2">
                      The TRN (Tax Registration Number) is set under Tax Configuration, with the VAT registration switch.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    <CardTitle>Branding</CardTitle>
                  </div>
                  <CardDescription>Logo and stamp printed on documents for this branch.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-gray-500" />
                        Logo
                      </Label>
                      <div className="sp-dropzone sp-dropzone--square">
                        {companyDetails.logoPreview ? (
                          <>
                            <img src={companyDetails.logoPreview} alt="Company Logo" />
                            <div className="sp-overlay">
                              <span className="text-white text-sm font-medium">Change Logo</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-7 w-7 text-gray-400" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-700">Upload Logo</p>
                              <p className="text-xs text-gray-500">Max 5MB</p>
                            </div>
                          </>
                        )}
                        <input
                          id="logoUpload"
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          onChange={handleLogoUpload}
                          title={companyDetails.logoPreview ? "Change Logo" : "Upload Logo"}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Stamp className="h-4 w-4 text-gray-500" />
                        Stamp
                      </Label>
                      <div className="sp-dropzone sp-dropzone--square">
                        {companyDetails.stampPreview ? (
                          <>
                            <img src={companyDetails.stampPreview} alt="Company Stamp" />
                            <div className="sp-overlay">
                              <span className="text-white text-sm font-medium">Change Stamp</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-7 w-7 text-gray-400" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-700">Upload Stamp</p>
                              <p className="text-xs text-gray-500">Transparent PNG, max 2MB</p>
                            </div>
                          </>
                        )}
                        <input
                          id="stampUpload"
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          onChange={handleStampUpload}
                          title={companyDetails.stampPreview ? "Change Stamp" : "Upload Stamp"}
                        />
                      </div>
                      {companyDetails.stampPreview && (
                        <button
                          type="button"
                          className="text-xs font-medium text-red-600 hover:underline"
                          onClick={() => handleCompanyChange("stampPreview", "")}
                        >
                          Remove stamp
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">The stamp is printed on purchase orders and invoices for this branch.</p>
                </CardContent>
              </Card>
            </div>

            <SettingsSaveBar
              isDirty={isCompanyDirty}
              saving={isCompanySaving}
              onSave={handleSaveCompany}
              label="Save Details"
              disabled={isCompanyLoading}
            />
          </div>
        </TabsContent>

        {settingsBranchId != null && (
          <BranchSettingsTab branchId={settingsBranchId} readOnly={isAllBranches} />
        )}

        {/* Tax Configuration */}
        <TabsContent value="tax">
          {settingsBranchId != null && <BranchTaxSettings branchId={settingsBranchId} readOnly={isAllBranches} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatPreview(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
