import { authService } from './auth-service';
import { parseApiError } from './api-error';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

// Payloads of /api/bios/insights/* (BiosInsightsDTO) — real figures for the BiOS
// analysis dialogs, scoped to the active branch like every other BiOS call.

export interface LabelCount { label: string; count: number }

export interface RevenueInsights {
  window_days: number;
  payment_methods: { method: string; transactions: number; amount: number }[];
  /** slot = ISO weekday 1 (Mon) – 7 (Sun) */
  by_weekday: { slot: number; transactions: number; amount: number }[];
  /** slot = hour 0–23 */
  by_hour: { slot: number; transactions: number; amount: number }[];
  membership_types: {
    membership_type: string; members: number; active_members: number; receipts: number;
    revenue: number; previous_revenue: number; avg_monthly_fee: number | null;
    lapsed_percent: number; avg_tenure_months: number | null;
  }[];
  trainers: SessionRevenue[];
  classes: SessionRevenue[];
  retail: { category: string; units: number; transactions: number; revenue: number; cost: number }[];
  /** last 30 days vs the 30 before */
  streams: { stream: string; current: number; previous: number }[];
  leads: number;
  converted_leads: number;
}

export interface SessionRevenue { name: string; sessions: number; bookings: number; capacity: number; revenue: number }

export interface ChannelRow { source: string; leads: number; converted: number; avg_ltv_converted: number | null }

export interface MemberInsights {
  as_of: string;
  segments: {
    membership_type: string; members: number; active_members: number;
    avg_visits30: number; class_bookings_per_active30: number; pt_bookings_per_active30: number;
    avg_age: number | null; avg_monthly_fee: number | null; avg_ltv: number | null; avg_tenure_months: number | null;
  }[];
  age_bands: { label: string; count: number; avg_ltv: number | null }[];
  genders: LabelCount[];
  nationalities: LabelCount[];
  average_age: number | null;
  members_with_birth_date: number;
  activity_levels: { label: string; count: number }[];
  engagement: { active_members: number; avg_visits_per_active30: number; class_uptake_percent: number; pt_uptake_percent: number };
  tenure_stages: { label: string; members: number; active_members: number }[];
  ltv: { average: number | null; paying_members: number; avg_tenure_months: number | null };
  acquisition: ChannelRow[];
  engagement_tiers: {
    tier: string; members: number; avg_visits_per_week: number; class_uptake_percent: number;
    avg_pos_purchases30: number; avg_ltv: number | null;
  }[];
  at_risk: {
    member_db_id: number; name: string; member_code: string | null; last_visit: string | null;
    days_since_visit: number | null; membership_ends: string | null;
  }[];
  satisfaction: Satisfaction;
}

export interface Satisfaction {
  responses: number;
  overall: number | null;
  trainer: number | null;
  equipment: number | null;
  facility: number | null;
  previous_overall: number | null;
  return_score: {
    responses: number; promoters: number; passives: number; detractors: number;
    score: number | null; previous_score: number | null;
  };
  reviews: { count: number; average: number | null; distribution: LabelCount[] };
  recent_comments: { date: string; rating: number | null; comment: string }[];
}

export interface OperationsInsights {
  daily: { date: string; check_ins: number; revenue: number; bookings: number; capacity: number }[];
  departments: {
    department: string; staff: number; revenue_target: number; revenue_achieved: number;
    sessions_target: number; sessions_achieved: number;
  }[];
  inventory: {
    products: number; stock_units: number; stock_value: number; low_stock: number;
    low_stock_items: StockItem[]; dead_stock: StockItem[];
    cost_changes: {
      product: string; supplier: string; previous_cost: number; latest_cost: number; latest_date: string | null;
      cheapest_supplier: string; cheapest_cost: number;
    }[];
  };
  assets: {
    count: number; purchase_value: number; current_value: number; annual_depreciation: number; in_maintenance: number;
    needing_service: {
      code: string; name: string; status: string; condition: string; utilization_rate: number | null;
      last_service: string | null; next_service: string | null; maintenance_cost12m: number;
    }[];
  };
  finance: {
    supplier_payables: number; member_receivables: number; members_with_balance: number;
    liabilities: { code: string; name: string; balance: number }[];
    cash_and_bank: number; avg_monthly_expenses: number;
  };
  expense_changes: { category: string; current: number; previous: number }[];
  report_activity: { period: string; reports: number; exports: number }[];
}

export interface StockItem { product: string; quantity: number; reorder_level: number; value: number; days_since_last_sale: number | null }

export interface MarketingInsights {
  window_days: number;
  lead_sources: ChannelRow[];
  promotions: {
    name: string; status: string; type: string; start_date: string | null; end_date: string | null;
    redemptions: number; revenue: number; savings: number;
  }[];
  referrals: { total: number; successful: number; pending: number; expired: number; rewards: number; purchase_value: number };
}

async function getJson<T>(path: string, label: string): Promise<T> {
  const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/bios/insights/${path}`);
  if (!response.ok) throw new Error(await parseApiError(response, `Failed to load ${label}: ${response.status}`));
  return response.json();
}

export const biosInsightsService = {
  getRevenue: (days = 90) => getJson<RevenueInsights>(`revenue?days=${days}`, 'revenue insights'),
  getMembers: () => getJson<MemberInsights>('members', 'member insights'),
  getOperations: () => getJson<OperationsInsights>('operations', 'operations insights'),
  getMarketing: (days = 365) => getJson<MarketingInsights>(`marketing?days=${days}`, 'marketing insights'),
};
