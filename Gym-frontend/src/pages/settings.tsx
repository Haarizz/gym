import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Settings as SettingsIcon, Coins, Check } from "lucide-react";
import { useCurrency, CURRENCIES, CurrencyCode, CurrencyGlyph } from "../utils/currency";

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
    </div>
  );
}
