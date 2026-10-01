// Step-level validation for the Create / Edit Promotion wizard. Every rule lives
// here so the "Next" button, step navigation, Save as Draft and the final submit all
// agree on what "valid" means.

export const PROMO_ACCESS_DAYS = "promotional-access-days";

export type PromotionStepId = "basic" | "discount" | "targeting" | "settings";

export const PROMOTION_STEPS: { id: PromotionStepId; label: string }[] = [
  { id: "basic", label: "Basic Info" },
  { id: "discount", label: "Discount" },
  { id: "targeting", label: "Targeting" },
  { id: "settings", label: "Settings" },
];

/** The subset of the page's promotion form these rules read */
export interface PromotionFormValues {
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  category: string;
  code: string;
  discountType: string;
  discountValue: string;
  minimumPurchase: string;
  maximumDiscount: string;
  usageLimit: string;
  usageLimitPerMember: string;
  targetAudience: string;
  priority: string;
}

export interface PromotionValidationContext {
  /** Rules configured in the Promotional Access Days builder */
  policyRuleCount: number;
}

export type FieldErrors = Partial<Record<string, string>>;

/** Order fields appear on screen — the first invalid one gets focus */
export const STEP_FIELD_ORDER: Record<PromotionStepId, string[]> = {
  basic: ["name", "type", "startDate", "endDate", "category", "code"],
  discount: ["discountType", "discountValue", "minimumPurchase", "maximumDiscount", "usageLimit", "usageLimitPerMember", "policyRules"],
  targeting: ["targetAudience"],
  settings: ["priority"],
};

// Varchar(255) columns on promotion_campaigns
const MAX_TEXT = 255;
// numeric(10, 2) columns
const MAX_AMOUNT = 99_999_999.99;

const isAccessDays = (v: PromotionFormValues) =>
  v.type === PROMO_ACCESS_DAYS || v.discountType === PROMO_ACCESS_DAYS;

function checkAmount(raw: string, label: string, opts: { required?: boolean; positive?: boolean } = {}): string | undefined {
  const value = raw.trim();
  if (!value) return opts.required ? `${label} is required.` : undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return `${label} must be a number.`;
  if (n < 0) return `${label} can't be negative.`;
  if (opts.positive && n === 0) return `${label} must be greater than 0.`;
  if (n > MAX_AMOUNT) return `${label} is too large.`;
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return `${label} can have at most 2 decimal places.`;
  return undefined;
}

function checkCount(raw: string, label: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  if (!/^\d+$/.test(value)) return `${label} must be a whole number.`;
  if (Number(value) === 0) return `${label} must be at least 1, or left empty for unlimited.`;
  if (Number(value) > 2_147_483_647) return `${label} is too large.`;
  return undefined;
}

export function validateStep(
  step: PromotionStepId,
  v: PromotionFormValues,
  ctx: PromotionValidationContext,
): FieldErrors {
  const e: FieldErrors = {};

  if (step === "basic") {
    if (!v.name.trim()) e.name = "Promotion name is required.";
    else if (v.name.trim().length > MAX_TEXT) e.name = `Promotion name must be ${MAX_TEXT} characters or fewer.`;
    if (!v.type) e.type = "Select a promotion type.";
    if (!v.startDate) e.startDate = "Start date is required.";
    if (!v.endDate) e.endDate = "End date is required.";
    if (v.startDate && v.endDate && v.endDate < v.startDate) {
      e.endDate = "End date can't be before the start date.";
    }
    if (!v.category) e.category = "Select a category.";
    if (v.code.trim().length > MAX_TEXT) e.code = `Promotion code must be ${MAX_TEXT} characters or fewer.`;
  }

  if (step === "discount") {
    if (!v.discountType) e.discountType = "Select a discount type.";
    const accessDays = isAccessDays(v);
    if (!accessDays && v.discountType && v.discountType !== "free") {
      const err = checkAmount(v.discountValue, "Discount value", { required: true, positive: true });
      if (err) e.discountValue = err;
      else if (v.discountType === "percentage" && Number(v.discountValue) > 100) {
        e.discountValue = "A percentage discount can't be more than 100%.";
      }
    }
    const minErr = checkAmount(v.minimumPurchase, "Minimum purchase");
    if (minErr) e.minimumPurchase = minErr;
    const maxErr = checkAmount(v.maximumDiscount, "Maximum discount", { positive: true });
    if (maxErr) e.maximumDiscount = maxErr;
    const limitErr = checkCount(v.usageLimit, "Total usage limit");
    if (limitErr) e.usageLimit = limitErr;
    const perMemberErr = checkCount(v.usageLimitPerMember, "Usage limit per member");
    if (perMemberErr) e.usageLimitPerMember = perMemberErr;
    else if (!limitErr && v.usageLimit.trim() && v.usageLimitPerMember.trim()
      && Number(v.usageLimitPerMember) > Number(v.usageLimit)) {
      e.usageLimitPerMember = "Per-member limit can't be higher than the total usage limit.";
    }
    if (accessDays && ctx.policyRuleCount === 0) {
      e.policyRules = "Add at least one access-days rule.";
    }
  }

  if (step === "targeting") {
    if (!v.targetAudience) e.targetAudience = "Select a target audience.";
  }

  if (step === "settings") {
    if (!v.priority) e.priority = "Select a priority level.";
  }

  return e;
}

export const hasErrors = (e: FieldErrors) => Object.keys(e).length > 0;

/** Index of the first step that fails validation, or -1 when everything is valid */
export function firstInvalidStepIndex(v: PromotionFormValues, ctx: PromotionValidationContext): number {
  return PROMOTION_STEPS.findIndex((s) => hasErrors(validateStep(s.id, v, ctx)));
}

/**
 * A draft only needs what the backend can't store without (name + type), plus any
 * field that is filled in but invalid on the Basic Info step.
 */
export function validateDraft(v: PromotionFormValues, ctx: PromotionValidationContext): FieldErrors {
  const basic = validateStep("basic", v, ctx);
  const draft: FieldErrors = {};
  if (basic.name) draft.name = basic.name;
  if (basic.type) draft.type = basic.type;
  if (basic.code) draft.code = basic.code;
  if (v.startDate && v.endDate && basic.endDate) draft.endDate = basic.endDate;
  return draft;
}
