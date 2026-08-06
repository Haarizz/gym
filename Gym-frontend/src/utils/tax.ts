import { financialSettingsService } from "./supabase/financial-settings-service";

// UAE VAT — one flat rate, no CGST/SGST/IGST split. Mirrors
// FinancialEventService.DEFAULT_VAT_RATE / VAT_RATE_SETTING_KEY on the
// backend so the rate shown on a printed receipt always matches what was
// actually posted to the ledger for that same payment.
export const DEFAULT_VAT_RATE = 5;
const SETTING_KEY = "standard_vat_rate";
const SETTING_CATEGORY = "TAX";

let cachedRate: number | null = null;
let inflight: Promise<number> | null = null;

export async function getVatRate(): Promise<number> {
  if (cachedRate !== null) return cachedRate;
  if (inflight) return inflight;

  inflight = financialSettingsService
    .getSettings(SETTING_CATEGORY)
    .then(settings => {
      const raw = settings.find(s => s.settingKey === SETTING_KEY)?.settingValue;
      const parsed = raw ? Number(raw) : NaN;
      cachedRate = Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_VAT_RATE;
      return cachedRate;
    })
    .catch(() => {
      cachedRate = DEFAULT_VAT_RATE;
      return cachedRate;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/**
 * Prices across this app (memberships, add-ons) are quoted VAT-inclusive —
 * the member never pays more than the sticker price. This splits what they
 * paid into the pre-tax amount and the VAT portion, purely for display on a
 * receipt; the backend computes and posts the identical split to the ledger
 * at payment time (FinancialEventService.splitVatInclusive).
 */
export function splitVatInclusive(grossAmount: number, ratePercent: number = DEFAULT_VAT_RATE): { net: number; vat: number } {
  if (!Number.isFinite(grossAmount) || ratePercent <= 0) {
    return { net: grossAmount, vat: 0 };
  }
  const net = Math.round((grossAmount / (1 + ratePercent / 100)) * 100) / 100;
  const vat = Math.round((grossAmount - net) * 100) / 100;
  return { net, vat };
}
