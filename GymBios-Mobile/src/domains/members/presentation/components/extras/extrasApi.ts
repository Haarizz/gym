import { apiClient } from '@/core/network/apiClient';

/**
 * Add-on plans and facilities for selling with a membership (New Member wizard) or to an
 * existing member (Sell add-on sheet). The backend re-prices registration items from the
 * catalogue (RegistrationAddonService), so prices here are only the preview.
 */
export interface CatalogAddon {
  id: number;
  name: string;
  price: number;
  validity: number;
  category?: string;
}

export interface CatalogFacility {
  id: string;
  name: string;
  rates: Record<string, number>;
}

/** One add-on / facility-access line chosen in the app. */
export interface RegistrationExtra {
  key: string;
  kind: 'addon' | 'facility';
  addonPlanId?: number;
  facilityId?: number;
  rateType?: string;
  quantity: number;
  name: string;
  category: string;
  price: number;
  days: number;
}

export const FACILITY_RATE_TYPES = ['Per Hour', 'Per Half Day', 'Per Full Day', 'Per Month'];
export const ADDON_CATEGORIES = ['Training', 'Nutrition', 'Spa', 'Classes', 'Other'];

export const extrasTotal = (extras: RegistrationExtra[]) =>
  Math.round(extras.reduce((sum, e) => sum + e.price, 0) * 100) / 100;

/** MemberRequestDTO.addons — the backend prices them, the app only says what was chosen. */
export const extrasRequest = (extras: RegistrationExtra[]) =>
  extras.map((e) => (e.kind === 'addon'
    ? { addon_plan_id: e.addonPlanId }
    : { facility_id: e.facilityId, rate_type: e.rateType, quantity: e.quantity }));

/** Same validity rule as the backend: a month is 30 days; day and hour rates are good for the day. */
export function facilityDays(rateType: string, qty: number): number {
  if (rateType.includes('Month')) return 30 * qty;
  if (rateType.includes('Day')) return qty;
  return 1;
}

export function addonExtra(plan: CatalogAddon): RegistrationExtra {
  return {
    key: `a-${plan.id}-${Date.now()}`, kind: 'addon', addonPlanId: plan.id, quantity: 1,
    name: plan.name, category: plan.category || 'Add-on', price: plan.price, days: plan.validity || 30,
  };
}

export function facilityExtra(f: CatalogFacility, rateType: string, quantity: number): RegistrationExtra {
  const qty = Math.max(1, Math.floor(quantity) || 1);
  return {
    key: `f-${f.id}-${rateType}-${Date.now()}`, kind: 'facility', facilityId: Number(f.id), rateType, quantity: qty,
    name: `${f.name} · ${rateType}${qty > 1 ? ` × ${qty}` : ''}`, category: 'Facility',
    price: Math.round((Number(f.rates[rateType]) || 0) * qty * 100) / 100, days: facilityDays(rateType, qty),
  };
}

export const extrasApi = {
  async addonPlans(): Promise<CatalogAddon[]> {
    const res = await apiClient.get<any[]>('/addon-plans', { params: { activeOnly: true } });
    return (res.data ?? [])
      .filter((p) => p.is_active !== false)
      .map((p) => ({ id: Number(p.id), name: p.name, price: Number(p.price ?? 0), validity: Number(p.validity ?? 30), category: p.category }));
  },

  async facilities(): Promise<CatalogFacility[]> {
    const res = await apiClient.get<any[]>('/facilities', { params: { status: 'Active' } });
    return (res.data ?? [])
      .filter((f) => String(f.status ?? 'Active').toLowerCase() === 'active' && f.rates && Object.keys(f.rates).length > 0)
      .map((f) => ({ id: String(f.id), name: f.name, rates: f.rates as Record<string, number> }));
  },

  async createAddonPlan(input: { name: string; price: number; validity: number; category: string }): Promise<CatalogAddon> {
    const res = await apiClient.post<any>('/addon-plans', { ...input, description: '', is_active: true });
    const p = res.data;
    return { id: Number(p.id), name: p.name, price: Number(p.price ?? input.price), validity: Number(p.validity ?? input.validity), category: p.category };
  },

  async createFacility(input: { name: string; rateType: string; rate: number; capacity: number }): Promise<CatalogFacility> {
    const res = await apiClient.post<any>('/facilities', {
      name: input.name, occupancy_limit: input.capacity, status: 'Active', rates: { [input.rateType]: input.rate },
    });
    const f = res.data;
    return { id: String(f.id), name: f.name, rates: f.rates ?? { [input.rateType]: input.rate } };
  },

  /**
   * Sells one add-on / facility access to an existing member on its own receipt
   * (POST /member-addons — the same sale the web's Add-ons page makes).
   */
  async sellToMember(member: { id: number; memberId?: string; name: string }, item: RegistrationExtra,
    payment: { paymentMode: string; paidAmount: number; paymentBreakdown?: unknown }) {
    const start = new Date();
    const end = new Date(start.getTime() + item.days * 86_400_000);
    await apiClient.post('/member-addons', {
      member_db_id: member.id,
      member_id: member.memberId,
      member_name: member.name,
      addon_name: item.name,
      category: item.category,
      amount: item.price,
      paid_amount: payment.paidAmount,
      payment_mode: payment.paymentMode,
      payment_breakdown: payment.paymentBreakdown,
      start_date: start.toISOString(),
      expiry_date: end.toISOString(),
      addon_plan_id: item.addonPlanId,
      facility_id: item.facilityId,
    });
  },
};

/** i18n key for what a freeze does to add-ons and facility access (Branch Settings › Membership Freeze). */
export function freezeRuleKey(pausesAddons?: boolean | null, pausesFacilities?: boolean | null): 'members.extras.ruleAll' | 'members.extras.ruleNone' | 'members.extras.ruleAddonsOnly' | 'members.extras.ruleFacilitiesOnly' {
  const addons = pausesAddons !== false;
  const facilities = pausesFacilities !== false;
  if (addons && facilities) return 'members.extras.ruleAll';
  if (!addons && !facilities) return 'members.extras.ruleNone';
  return addons ? 'members.extras.ruleAddonsOnly' : 'members.extras.ruleFacilitiesOnly';
}
