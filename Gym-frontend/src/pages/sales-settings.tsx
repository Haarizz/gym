import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { Skeleton } from "../components/ui/skeleton";
import { PackageCheck, Printer, Settings as SettingsIcon, SlidersHorizontal } from "lucide-react";
import { financialSettingsService } from "../utils/supabase/financial-settings-service";
import { ModuleHeader } from "../components/purchase/purchaseUi";
import styles from "../components/purchase/PurchaseInvoice.module.css";
import { PrintTemplatesManager } from "../components/print-templates/PrintTemplatesManager";

const SETTING_CATEGORY = "SALES_SETTINGS";
const STOCK_CHECK_KEY = "stock_check_enabled";

type SettingsTab = "general" | "print-templates";

export function SalesSettings() {
  const [params, setParams] = useSearchParams();
  const tab: SettingsTab = params.get("tab") === "print-templates" ? "print-templates" : "general";
  const setTab = (t: SettingsTab) => setParams(t === "general" ? {} : { tab: t }, { replace: true });

  return (
    <div className={styles.page}>
      <ModuleHeader
        title="Settings"
        icon={SettingsIcon}
        subtitle={tab === "general"
          ? "Configure how sales and purchases behave, including stock handling for POS sales."
          : "Design how purchase orders and purchase invoices print — each branch prints with its own company details and logo."}
        tabs={[
          { key: "general", label: "General", icon: SlidersHorizontal, active: tab === "general", onClick: () => setTab("general") },
          { key: "print-templates", label: "Print Templates", icon: Printer, active: tab === "print-templates", onClick: () => setTab("print-templates") },
        ]}
      />
      <div className={styles.fadeIn} key={tab}>
        {tab === "general" ? <GeneralSettings /> : <PrintTemplatesManager />}
      </div>
    </div>
  );
}

function GeneralSettings() {
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
        description: "When enabled, completing a POS sale or confirming a sales invoice reduces product stock (and refunding / cancelling restores it), and a sale is blocked when stock is short. When disabled, sales never touch stock.",
      });
      toast.success(`Stock Check turned ${checked ? "on" : "off"}`, {
        description: checked
          ? "POS sales and sales invoices will now reduce product stock."
          : "POS sales and sales invoices will no longer affect product stock.",
      });
    } catch (error) {
      setStockCheckEnabled(previous);
      toast.error("Failed to save Stock Check setting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1E293B]">
            <PackageCheck className="h-5 w-5 text-[#2B7A78]" />
            Inventory
          </CardTitle>
          <CardDescription>Controls how POS sales and sales invoices interact with product stock levels.</CardDescription>
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
                  When on, completing a sale in POS or confirming a sales invoice reduces product stock
                  automatically (refunding or cancelling restores it), and a sale can't go through when the
                  warehouse doesn't have enough. When off, sales never adjust stock — useful for services or
                  gyms that don't track retail inventory.
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
