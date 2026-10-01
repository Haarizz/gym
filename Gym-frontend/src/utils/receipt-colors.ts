import { financialSettingsService } from "./supabase/financial-settings-service";

/**
 * Colours of the printed member receipt / tax invoice. Saved per branch in the
 * branch-scoped APP_PREFERENCES settings, so each branch can brand its receipts.
 */
export interface ReceiptColors {
  /** Company name, headings, table header, totals, borders */
  primary: string;
  /** Background of the info / bill-to / totals panels */
  panel: string;
  /** Background of the payment details box */
  highlight: string;
  /** Left border of the payment details box */
  highlightBorder: string;
}

export const DEFAULT_RECEIPT_COLORS: ReceiptColors = {
  primary: "#327F74",
  panel: "#f9fafb",
  highlight: "#fef3c7",
  highlightBorder: "#f59e0b",
};

const SETTING_KEY = "receipt_colors";
const SETTING_CATEGORY = "APP_PREFERENCES";
const HEX = /^#[0-9a-fA-F]{6}$/;

const cache = new Map<string, ReceiptColors>();
// Keyed by branch (like company details) so switching branch never reuses another branch's colours
const cacheKey = (branchId?: number | null) => {
  if (branchId != null) return String(branchId);
  const id = sessionStorage.getItem("activeBranchId");
  return id && id !== "null" && id !== "undefined" ? id : "default";
};

function parse(value: string | null | undefined): ReceiptColors {
  if (!value) return { ...DEFAULT_RECEIPT_COLORS };
  try {
    const raw = JSON.parse(value);
    const pick = (k: keyof ReceiptColors) => (typeof raw?.[k] === "string" && HEX.test(raw[k]) ? raw[k] : DEFAULT_RECEIPT_COLORS[k]);
    return { primary: pick("primary"), panel: pick("panel"), highlight: pick("highlight"), highlightBorder: pick("highlightBorder") };
  } catch {
    return { ...DEFAULT_RECEIPT_COLORS };
  }
}

/** Saved receipt colours for the active branch (or `branchId`), falling back to the defaults */
export async function getReceiptColors(branchId?: number | null): Promise<ReceiptColors> {
  const key = cacheKey(branchId);
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const settings = await financialSettingsService.getSettings(SETTING_CATEGORY, branchId);
    const colors = parse(settings.find((s) => s.settingKey === SETTING_KEY)?.settingValue);
    cache.set(key, colors);
    return colors;
  } catch {
    return { ...DEFAULT_RECEIPT_COLORS };
  }
}

/** Saves the colours for the active branch */
export async function saveReceiptColors(colors: ReceiptColors): Promise<void> {
  await financialSettingsService.upsertSetting({
    settingKey: SETTING_KEY,
    settingValue: JSON.stringify(colors),
    category: SETTING_CATEGORY,
    description: "Printed receipt colours",
  });
  cache.clear();
}

/** Drop cached colours, e.g. after switching branch */
export function invalidateReceiptColors() {
  cache.clear();
}

/** CSS custom properties the receipt template reads */
export function receiptColorsCss(colors: ReceiptColors = DEFAULT_RECEIPT_COLORS): string {
  return `:root{--rc-primary:${colors.primary};--rc-panel:${colors.panel};--rc-highlight:${colors.highlight};--rc-highlight-border:${colors.highlightBorder};}`;
}
