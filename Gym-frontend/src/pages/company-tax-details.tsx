import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { IdCard, Save, RefreshCw } from "lucide-react";
import { cn } from "../components/ui/utils";
import { toast } from "sonner";
import {
  companyTaxDetailsService, type CompanyTaxDetails,
} from "../utils/supabase/company-tax-details-service";

export function CompanyTaxDetailsPage() {
  const [details, setDetails] = useState<CompanyTaxDetails>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setDetails(await companyTaxDetailsService.get());
    } catch (err: any) {
      toast.error(err.message || "Failed to load company tax details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const saved = await companyTaxDetailsService.update(details);
      setDetails(saved);
      toast.success("Company tax details saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save company tax details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Company Tax Details</h1>
          <p className="text-gray-600 mt-1">Registration details surfaced on receipts, invoices and reports</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />Refresh
        </Button>
      </div>

      <Card className="bg-white border-0 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><IdCard className="h-5 w-5 text-primary" />Registration Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Legal Name</Label>
            <Input value={details.legalName ?? ""} onChange={(e) => setDetails({ ...details, legalName: e.target.value })} placeholder="Registered company name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input value={details.gstNumber ?? ""} onChange={(e) => setDetails({ ...details, gstNumber: e.target.value })} placeholder="GSTIN" />
            </div>
            <div className="space-y-2">
              <Label>VAT Number</Label>
              <Input value={details.vatNumber ?? ""} onChange={(e) => setDetails({ ...details, vatNumber: e.target.value })} placeholder="VAT registration number" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>TRN (Tax Registration Number)</Label>
            <Input value={details.trn ?? ""} onChange={(e) => setDetails({ ...details, trn: e.target.value })} placeholder="e.g. 100XXXXXXXXXXX3" />
          </div>
          <div className="space-y-2">
            <Label>Registered Address</Label>
            <Textarea value={details.address ?? ""} onChange={(e) => setDetails({ ...details, address: e.target.value })} rows={3} />
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Details"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
