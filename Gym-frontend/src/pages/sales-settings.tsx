import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { Skeleton } from "../components/ui/skeleton";
import { PackageCheck } from "lucide-react";
import { financialSettingsService } from "../utils/supabase/financial-settings-service";

const SETTING_CATEGORY = "SALES_SETTINGS";
const STOCK_CHECK_KEY = "stock_check_enabled";

export function SalesSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [stockCheckEnabled, setStockCheckEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    financialSettingsService
      .getSettings(SETTING_CATEGORY)
      .then((settings) => {
        if (cancelled) return;
        const saved = settings.find((s) => s.settingKey === STOCK_CHECK_KEY)?.settingValue;
        if (saved != null) setStockCheckEnabled(saved !== "false");
      })
      .catch(() => {
        // No setting saved yet, or backend unavailable — default (ON) stands.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleStockCheck = async (checked: boolean) => {
    const previous = stockCheckEnabled;
    setStockCheckEnabled(checked);
    setSaving(true);
    try {
      await financialSettingsService.upsertSetting({
        settingKey: STOCK_CHECK_KEY,
        settingValue: String(checked),
        category: SETTING_CATEGORY,
        description: "When enabled, completing a POS sale reduces product stock (and refunding restores it). When disabled, POS sales never touch stock.",
      });
      toast.success(`Stock Check turned ${checked ? "on" : "off"}`, {
        description: checked
          ? "POS sales will now reduce product stock."
          : "POS sales will no longer affect product stock.",
      });
    } catch (error) {
      setStockCheckEnabled(previous);
      toast.error("Failed to save Stock Check setting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1E293B]">Sales Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure sales system settings including tax rates, payment methods, and transaction preferences.
        </p>
      </div>

      <Card className="border-0 shadow-md max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1E293B]">
            <PackageCheck className="h-5 w-5 text-[#2B7A78]" />
            Inventory
          </CardTitle>
          <CardDescription>Controls how POS sales interact with product stock levels.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-72" />
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 bg-[#F9FAFB] p-4">
              <div className="space-y-1">
                <Label htmlFor="stock-check" className="text-sm font-medium text-[#1E293B]">
                  Stock Check
                </Label>
                <p className="text-sm text-muted-foreground max-w-md">
                  When on, completing a sale in POS reduces product stock automatically (and refunding a sale
                  restores it). When off, POS sales never adjust stock — useful for services or gyms that don't
                  track retail inventory.
                </p>
              </div>
              <Switch
                id="stock-check"
                checked={stockCheckEnabled}
                onCheckedChange={handleToggleStockCheck}
                disabled={saving}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
