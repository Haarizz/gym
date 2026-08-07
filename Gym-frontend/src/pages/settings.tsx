import React, { useState, useEffect } from "react";
import { financialSettingsService } from "../utils/supabase/financial-settings-service";
import { invalidateCompanyDetailsCache } from "../utils/company-details";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Settings as SettingsIcon, Coins, Check, Building, MapPin, Mail, Phone, UploadCloud, Building2, Image as ImageIcon, Hash } from "lucide-react";
import { useCurrency, CURRENCIES, CurrencyCode, CurrencyGlyph } from "../utils/currency";
import { toast } from "sonner";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";

export function AppSettings() {
  const { currencyCode, currency, setCurrencyCode, saving } = useCurrency();
  const [pendingCode, setPendingCode] = useState<CurrencyCode>(currencyCode);

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
    trn: ""
  });
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
          trn: ""
        };
        settings.forEach(s => {
          if (s.settingKey === "company_name") details.name = s.settingValue;
          if (s.settingKey === "company_address") details.address = s.settingValue;
          if (s.settingKey === "company_email") details.email = s.settingValue;
          if (s.settingKey === "company_phone") details.phone = s.settingValue;
          if (s.settingKey === "company_logo") details.logoPreview = s.settingValue;
          if (s.settingKey === "company_trn") details.trn = s.settingValue;
        });
        setCompanyDetails(details);
      } catch (err) {
        console.error("Failed to load company details", err);
      } finally {
        setIsCompanyLoading(false);
      }
    };
    loadSettings();
  }, []);

  const [isCompanyDirty, setIsCompanyDirty] = useState(false);

  const handleCompanyChange = (field: string, value: string) => {
    setCompanyDetails(prev => ({ ...prev, [field]: value }));
    setIsCompanyDirty(true);
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

  const handleSaveCompany = async () => {
    setIsCompanySaving(true);
    try {
      const keys = [
        { key: "company_name", val: companyDetails.name },
        { key: "company_address", val: companyDetails.address },
        { key: "company_email", val: companyDetails.email },
        { key: "company_phone", val: companyDetails.phone },
        { key: "company_logo", val: companyDetails.logoPreview },
        { key: "company_trn", val: companyDetails.trn },
      ].filter(k => k.val.trim() !== "");

      await Promise.all(keys.map(k =>
        financialSettingsService.upsertSetting({
          settingKey: k.key,
          settingValue: k.val,
          category: "COMPANY",
          description: `Company ${k.key.split('_')[1]}`
        })
      ));

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

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Application-wide preferences for GymBios</p>
          </div>
        </div>
      </div>

      <Card className="bg-white border-0 shadow-sm max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <CardTitle>Currency</CardTitle>
          </div>
          <CardDescription>
            Choose the currency symbol and code used everywhere amounts are displayed in the app —
            dashboards, invoices, billing, reports and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Display Currency</label>
            <Select value={pendingCode} onValueChange={(v) => setPendingCode(v as CurrencyCode)}>
              <SelectTrigger className="w-full sm:w-80">
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
          </div>

          <div className="rounded-lg border bg-gray-50 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preview</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center">
                  <CurrencyGlyph code={pendingCode} />
                </span>
                1,250.00
              </p>
            </div>
            {!isDirty && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                <Check className="h-4 w-4" />
                Currently active ({currency.code})
              </span>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={handleSave} disabled={!isDirty || saving}>
              {saving ? "Saving..." : "Save Currency"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white border-0 shadow-sm max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Company Details</CardTitle>
          </div>
          <CardDescription>
            Update your company information. These details may appear on invoices, reports, and the member portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 space-y-4 w-full">
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
                    onChange={(e) => handleCompanyChange("phone", e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-gray-500" />
                  Company Logo
                </Label>
                <div className="border-2 border-dashed rounded-xl p-4 w-full md:w-48 flex flex-col items-center justify-center text-center gap-3 bg-gray-50/50 relative overflow-hidden transition-colors hover:bg-gray-50 h-48">
                  {companyDetails.logoPreview ? (
                    <>
                      <img src={companyDetails.logoPreview} alt="Company Logo" className="max-h-full max-w-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Label htmlFor="logoUpload" className="cursor-pointer text-white text-sm font-medium hover:underline">Change Logo</Label>
                      </div>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-8 w-8 text-gray-400" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-700">Upload Logo</p>
                        <p className="text-xs text-gray-500">Max size 5MB</p>
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
            </div>

            <div className="space-y-2">
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

            <div className="space-y-2">
              <Label htmlFor="trn" className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-500" />
                Tax Registration Number (TRN)
              </Label>
              <Input
                id="trn"
                placeholder="e.g. 100123456700003"
                value={companyDetails.trn}
                onChange={(e) => handleCompanyChange("trn", e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Your UAE FTA Tax Registration Number. Printed on every Tax Invoice — required for it to be a valid tax document.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={handleSaveCompany} disabled={!isCompanyDirty || isCompanySaving || isCompanyLoading}>
              {isCompanySaving ? "Saving to DB..." : "Save Details"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
