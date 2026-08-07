import { financialSettingsService } from "./supabase/financial-settings-service";

export interface CompanyDetails {
  name: string;
  address: string;
  email: string;
  phone: string;
  logo: string; // data URL, or "" if none uploaded
  /** UAE FTA Tax Registration Number — required on any document titled "Tax Invoice". */
  trn: string;
}

const DEFAULT_COMPANY: CompanyDetails = {
  name: "GymBios",
  address: "Dubai, United Arab Emirates",
  email: "",
  phone: "",
  logo: "",
  trn: "",
};

let cached: CompanyDetails | null = null;
let inflight: Promise<CompanyDetails> | null = null;

// Company details rarely change and are needed on every receipt print, so
// fetch once and reuse across the session; settings.tsx calls
// invalidateCompanyDetailsCache() after a successful save.
export async function getCompanyDetails(): Promise<CompanyDetails> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = financialSettingsService
    .getSettings("COMPANY")
    .then(settings => {
      const details = { ...DEFAULT_COMPANY };
      settings.forEach(s => {
        if (!s.settingValue) return;
        if (s.settingKey === "company_name") details.name = s.settingValue;
        if (s.settingKey === "company_address") details.address = s.settingValue;
        if (s.settingKey === "company_email") details.email = s.settingValue;
        if (s.settingKey === "company_phone") details.phone = s.settingValue;
        if (s.settingKey === "company_logo") details.logo = s.settingValue;
        if (s.settingKey === "company_trn") details.trn = s.settingValue;
      });
      cached = details;
      return details;
    })
    .catch(err => {
      console.error("Failed to load company details, using defaults", err);
      return DEFAULT_COMPANY;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function invalidateCompanyDetailsCache() {
  cached = null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Shared CSS for the `.brand`/`.verify-box` header block rendered by
// buildCompanyHeaderHtml — include once in each printable receipt's <style>.
export const COMPANY_HEADER_CSS = `
  .header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:16px}
  .verify-box{text-align:left;min-width:140px}
  .verify-box .label{font-size:9px;font-weight:700;color:#2B7A78;letter-spacing:1px;text-transform:uppercase}
  .verify-box .rcpt{font-size:12px;font-weight:700;color:#1a1a1a;margin-top:3px}
  .brand{text-align:right;display:flex;flex-direction:column;align-items:flex-end}
  .brand .company-logo{max-height:42px;max-width:180px;object-fit:contain;margin-bottom:4px}
  .brand h1{font-size:17px;font-weight:800;color:#2B7A78;line-height:1.2}
  .brand .address{margin-top:3px;font-size:10.5px;color:#444;line-height:1.4}
  .brand .trn{margin-top:3px;font-size:10.5px;font-weight:700;color:#1a1a1a}
`;

// Renders the receipt header: verification box on the left, company logo +
// name + contact details on the top right of the page.
export function buildCompanyHeaderHtml(company: CompanyDetails, receiptNo: string): string {
  const logoImg = company.logo
    ? `<img src="${company.logo}" alt="${escapeHtml(company.name)} logo" class="company-logo"/>`
    : "";
  const contactParts = [company.phone && `Phone: ${escapeHtml(company.phone)}`, company.email && `Email: ${escapeHtml(company.email)}`]
    .filter(Boolean)
    .join(" | ");
  const addressLines = [company.address && escapeHtml(company.address), contactParts].filter(Boolean).join("<br/>");
  const trnLine = company.trn ? `<div class="trn">TRN: ${escapeHtml(company.trn)}</div>` : "";

  return `
  <div class="verify-box">
    <div class="label">Receipt Verification</div>
    <div class="rcpt">${escapeHtml(receiptNo)}</div>
  </div>
  <div class="brand">
    ${logoImg}
    <h1>${escapeHtml(company.name)}</h1>
    <div class="address">${addressLines}</div>
    ${trnLine}
  </div>`;
}

// Renders the plain-text footer branding block (no logo — keeps the print
// footer compact) used at the bottom of every receipt.
export function buildCompanyFooterHtml(company: CompanyDetails): string {
  const contactParts = [company.phone && `Phone: ${escapeHtml(company.phone)}`, company.email && `Email: ${escapeHtml(company.email)}`]
    .filter(Boolean)
    .join(" | ");
  const trnPart = company.trn && `TRN: ${escapeHtml(company.trn)}`;
  return `
    <strong>${escapeHtml(company.name)}</strong><br/>
    ${[company.address && escapeHtml(company.address), contactParts].filter(Boolean).join(" | ")}
    ${trnPart ? `<br/>${trnPart}` : ""}
  `;
}
