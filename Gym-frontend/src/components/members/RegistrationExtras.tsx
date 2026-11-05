import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, Package, Plus, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { addonPlansService, type AddonPlan } from "../../utils/supabase/addon-plans-service";
import { facilitiesService, type FacilityApi } from "../../utils/supabase/facilities-service";
import { useCurrency } from "../../utils/currency";
import s from "./registration-extras.module.css";

/**
 * Add-ons and facility access sold with a new membership (New Member Registration). They go on
 * the membership's own receipt; the backend re-prices every line from the catalogue
 * (RegistrationAddonService), so the prices here are only the preview.
 */
export interface RegistrationExtra {
  key: string;
  kind: "addon" | "facility";
  addonPlanId?: number;
  facilityId?: number;
  rateType?: string;
  quantity: number;
  name: string;
  detail: string;
  price: number;
}

export const extrasTotal = (extras: RegistrationExtra[]) =>
  Math.round(extras.reduce((sum, e) => sum + e.price, 0) * 100) / 100;

/** Request body items for POST /members (MemberRequestDTO.addons). */
export const extrasRequest = (extras: RegistrationExtra[]) =>
  extras.map((e) => e.kind === "addon"
    ? { addon_plan_id: e.addonPlanId }
    : { facility_id: Number(e.facilityId), rate_type: e.rateType, quantity: e.quantity });

const RATE_TYPES = ["Per Hour", "Per Half Day", "Per Full Day", "Per Month"];
const ADDON_CATEGORIES = ["Training", "Nutrition", "Spa", "Classes", "Other"];
const unitOf = (rateType?: string) =>
  !rateType ? "" : rateType.includes("Month") ? "month" : rateType.includes("Day") ? "day" : "hour";

export function RegistrationExtras({ value, onChange }: { value: RegistrationExtra[]; onChange: (next: RegistrationExtra[]) => void }) {
  const { formatCurrency } = useCurrency();
  const money = (n: number) => formatCurrency(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [plans, setPlans] = useState<AddonPlan[]>([]);
  const [facilities, setFacilities] = useState<FacilityApi[]>([]);
  const [planId, setPlanId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [rateType, setRateType] = useState("");
  const [qty, setQty] = useState("1");
  const [quick, setQuick] = useState<null | "addon" | "facility">(null);

  const load = async () => {
    try {
      const [p, f] = await Promise.all([addonPlansService.getAll(true), facilitiesService.getFacilities({ status: "Active" })]);
      setPlans(p.filter((x) => x.isActive));
      setFacilities(f.filter((x) => (x.status || "Active").toLowerCase() === "active" && Object.keys(x.rates || {}).length > 0));
    } catch {
      // Section stays usable through Quick add; the registration itself doesn't depend on it.
    }
  };
  useEffect(() => { load(); }, []);

  // Each add-on / facility goes on the registration once — chosen ones drop out of the pickers
  // (remove a facility from the list to change its rate or quantity).
  const chosenPlans = new Set(value.filter((e) => e.kind === "addon").map((e) => Number(e.addonPlanId)));
  const chosenFacilities = new Set(value.filter((e) => e.kind === "facility").map((e) => Number(e.facilityId)));
  const planOptions = plans.filter((p) => !chosenPlans.has(Number(p.id)));
  const facilityOptions = facilities.filter((f) => !chosenFacilities.has(Number(f.id)));

  const facility = facilities.find((f) => f.id === facilityId);
  const facilityRates = useMemo(() => Object.entries(facility?.rates || {}), [facility]);
  useEffect(() => {
    if (!facility) { setRateType(""); return; }
    const keys = Object.keys(facility.rates || {});
    setRateType(keys.includes("Per Month") ? "Per Month" : keys[0] || "");
  }, [facilityId, facilities]);

  const addPlan = (plan: AddonPlan) => {
    if (chosenPlans.has(Number(plan.id))) { setPlanId(""); return; }
    onChange([...value, {
      key: `a-${plan.id}-${Date.now()}`, kind: "addon", addonPlanId: plan.id, quantity: 1,
      name: plan.name, detail: `${plan.category || "Add-on"} · ${plan.validity || 30} days`, price: Number(plan.price) || 0,
    }]);
    setPlanId("");
  };

  const addFacility = (f: FacilityApi, rate: string, quantity: number) => {
    const unit = Number(f.rates?.[rate]) || 0;
    const n = Math.max(1, Math.floor(quantity) || 1);
    if (chosenFacilities.has(Number(f.id))) { setFacilityId(""); return; }
    onChange([...value, {
      key: `f-${f.id}-${rate}-${Date.now()}`, kind: "facility", facilityId: Number(f.id), rateType: rate, quantity: n,
      name: `${f.name} · ${rate}${n > 1 ? ` × ${n}` : ""}`,
      detail: `Facility access · ${unitOf(rate) === "month" ? `${30 * n} days` : unitOf(rate) === "day" ? `${n} day${n > 1 ? "s" : ""}` : "1 day"}`,
      price: Math.round(unit * n * 100) / 100,
    }]);
    setFacilityId("");
    setQty("1");
  };

  return (
    <div>
      <div className={s.pickers}>
        <div className={s.picker}>
          <div className={s.pickerHead}>
            <span className={s.pickerTitle}><Package />Add-on</span>
            <button type="button" className={s.quickAdd} onClick={() => setQuick("addon")}><Plus />Quick add</button>
          </div>
          <div className={s.row}>
            <div className={s.grow}>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger aria-label="Add-on"><SelectValue placeholder={!plans.length ? "No add-ons yet — use Quick add" : planOptions.length ? "Choose an add-on" : "All add-ons added"} /></SelectTrigger>
                <SelectContent>
                  {planOptions.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} — {money(Number(p.price) || 0)} · {p.validity || 30} days</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" disabled={!planId}
              onClick={() => { const p = plans.find((x) => String(x.id) === planId); if (p) addPlan(p); }}>
              <Plus className="h-4 w-4 mr-1" />Add
            </Button>
          </div>
        </div>

        <div className={s.picker}>
          <div className={s.pickerHead}>
            <span className={s.pickerTitle}><Building2 />Facility access</span>
            <button type="button" className={s.quickAdd} onClick={() => setQuick("facility")}><Plus />Quick add</button>
          </div>
          <div className={s.row}>
            <div className={s.grow}>
              <Select value={facilityId} onValueChange={setFacilityId}>
                <SelectTrigger aria-label="Facility"><SelectValue placeholder={!facilities.length ? "No facilities yet — use Quick add" : facilityOptions.length ? "Choose a facility" : "All facilities added"} /></SelectTrigger>
                <SelectContent>
                  {facilityOptions.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {facility && (
            <div className={s.row}>
              <div className={s.grow}>
                <Select value={rateType} onValueChange={setRateType}>
                  <SelectTrigger aria-label="Rate"><SelectValue placeholder="Rate" /></SelectTrigger>
                  <SelectContent>
                    {facilityRates.map(([r, price]) => <SelectItem key={r} value={r}>{r} — {money(Number(price) || 0)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input className={s.qty} type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} aria-label={`Number of ${unitOf(rateType) || "units"}s`} />
              <Button type="button" variant="outline" disabled={!rateType}
                onClick={() => addFacility(facility, rateType, Number(qty))}>
                <Plus className="h-4 w-4 mr-1" />Add
              </Button>
            </div>
          )}
          {facility && rateType && <span className={s.hint}>Quantity = number of {unitOf(rateType)}s. A month is 30 days of access.</span>}
        </div>
      </div>

      {value.length === 0 ? (
        <p className={s.empty}>Nothing added — optional. Anything added here goes on the membership's receipt.</p>
      ) : (
        <div className={s.list}>
          {value.map((e) => (
            <div key={e.key} className={s.item}>
              <span className={s.itemIcon}>{e.kind === "addon" ? <Package /> : <Building2 />}</span>
              <div className={s.itemText}>
                <span className={s.itemName}>{e.name}</span>
                <span className={s.itemMeta}>{e.detail}</span>
              </div>
              <span className={s.itemPrice}>{money(e.price)}</span>
              <button type="button" className={s.remove} aria-label={`Remove ${e.name}`} onClick={() => onChange(value.filter((x) => x.key !== e.key))}><X /></button>
            </div>
          ))}
          <div className={s.total}><span>Add-ons & facilities</span><strong>{money(extrasTotal(value))}</strong></div>
        </div>
      )}

      <QuickAddAddon open={quick === "addon"} onClose={() => setQuick(null)}
        onCreated={(plan) => { setPlans((prev) => [...prev, plan]); addPlan(plan); }} />
      <QuickAddFacility open={quick === "facility"} onClose={() => setQuick(null)}
        onCreated={(f, rate) => { setFacilities((prev) => [...prev, f]); addFacility(f, rate, 1); }} />
    </div>
  );
}

function QuickAddAddon({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (p: AddonPlan) => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [validity, setValidity] = useState("30");
  const [category, setCategory] = useState("Other");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setName(""); setPrice(""); setValidity("30"); setCategory("Other"); } }, [open]);

  const save = async () => {
    if (!name.trim()) { toast.error("Enter the add-on's name"); return; }
    if (!(Number(price) > 0)) { toast.error("Enter a price"); return; }
    setSaving(true);
    try {
      const plan = await addonPlansService.create({ name: name.trim(), price: Number(price), validity: Math.max(1, Number(validity) || 30), category, isActive: true, description: "" });
      toast.success(`${plan.name} added to the catalogue`);
      onCreated(plan);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Couldn't create the add-on");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick add — add-on</DialogTitle>
          <DialogDescription>Creates it in Plans &amp; Services › Add-ons and adds it to this registration.</DialogDescription>
        </DialogHeader>
        <div className={s.form}>
          <div><Label htmlFor="qa-name">Name</Label><Input id="qa-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Personal Training (8 sessions)" /></div>
          <div className={s.formRow}>
            <div><Label htmlFor="qa-price">Price</Label><Input id="qa-price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div><Label htmlFor="qa-validity">Valid for (days)</Label><Input id="qa-validity" type="number" min={1} value={validity} onChange={(e) => setValidity(e.target.value)} /></div>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ADDON_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Create & add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuickAddFacility({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (f: FacilityApi, rate: string) => void }) {
  const [name, setName] = useState("");
  const [rateType, setRateType] = useState("Per Month");
  const [rate, setRate] = useState("");
  const [capacity, setCapacity] = useState("20");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setName(""); setRateType("Per Month"); setRate(""); setCapacity("20"); } }, [open]);

  const save = async () => {
    if (!name.trim()) { toast.error("Enter the facility's name"); return; }
    if (!(Number(rate) > 0)) { toast.error("Enter a rate"); return; }
    setSaving(true);
    try {
      const f = await facilitiesService.createFacility({
        name: name.trim(), occupancy_limit: Math.max(1, Number(capacity) || 1), status: "Active",
        rates: { [rateType]: Number(rate) },
      });
      toast.success(`${f.name} added to Facilities`);
      onCreated(f, rateType);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Couldn't create the facility");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick add — facility</DialogTitle>
          <DialogDescription>Creates it in Facilities with one rate and adds access to this registration.</DialogDescription>
        </DialogHeader>
        <div className={s.form}>
          <div><Label htmlFor="qf-name">Facility name</Label><Input id="qf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Swimming Pool" /></div>
          <div className={s.formRow}>
            <div>
              <Label>Rate</Label>
              <Select value={rateType} onValueChange={setRateType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RATE_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="qf-rate">Price</Label><Input id="qf-rate" type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} /></div>
          </div>
          <div><Label htmlFor="qf-cap">Capacity (people at once)</Label><Input id="qf-cap" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Create & add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
