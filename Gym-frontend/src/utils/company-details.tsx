import { financialSettingsService } from "./supabase/financial-settings-service";
// @ts-ignore - qr.js ships no type declarations
import QRCodeGenerator from "qr.js/lib/QRCode";
// @ts-ignore - qr.js ships no type declarations
import ErrorCorrectLevel from "qr.js/lib/ErrorCorrectLevel";

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

// Renders `value` as a scannable QR code, as an inline SVG string (no <img>/
// data-URI round-trip needed) — safe to drop straight into a print HTML
// string since it's built with the same `qr.js` encoder react-qr-code uses
// internally, just without the React tree that component requires.
function buildQrCodeSvg(value: string): string {
  const qr = new QRCodeGenerator(-1, ErrorCorrectLevel.M);
  qr.addData(value);
  qr.make();
  const cells: boolean[][] = qr.modules;
  const cellCount = cells.length;
  const path = cells
    .map((row: boolean[], r: number) =>
      row.map((isDark, c) => (isDark ? `M${c} ${r}l1 0 0 1 -1 0Z` : "")).join(" ")
    )
    .join(" ");
  // No fixed width/height — .qr-inner svg (in COMPANY_HEADER_CSS) sizes it via
  // CSS so it automatically fills whatever box it lands in (bigger on screen,
  // smaller in the print layout) instead of floating undersized in either.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cellCount} ${cellCount}" shape-rendering="crispEdges"><rect width="${cellCount}" height="${cellCount}" fill="#ffffff"/><path d="${path}" fill="#000000"/></svg>`;
}

// Extra fields folded into the verification QR's payload, on top of the
// receipt number every caller already has. All optional since not every
// call site (e.g. a receipt still being drafted) has the full picture yet.
export interface ReceiptQrDetails {
  date?: string;
  billTo?: string;
  amount?: string;
  status?: string;
}

// The QR encodes the bill details directly as plain text — same approach
// GCC e-invoicing QR codes use — rather than a URL, so scanning it shows the
// bill on the scanning phone with no server round-trip or public endpoint.
function buildReceiptQrPayload(company: CompanyDetails, receiptNo: string, details?: ReceiptQrDetails): string {
  const lines = [
    `${company.name} - Tax Invoice`,
    `Receipt No: ${receiptNo}`,
  ];
  if (details?.date) lines.push(`Date: ${details.date}`);
  if (details?.billTo) lines.push(`Bill To: ${details.billTo}`);
  if (details?.amount) lines.push(`Amount: ${details.amount}`);
  if (details?.status) lines.push(`Status: ${details.status}`);
  if (company.trn) lines.push(`TRN: ${company.trn}`);
  return lines.join("\n");
}

// Shared CSS for the `.header-left`/`.qr-top-right` header block rendered by
// buildCompanyHeaderHtml — include once in each printable receipt's <style>.
// Values match the approved receipt mockup exactly (company name/detail
// sizes, the 120x120 verification box) — company on the top-left, a
// scannable QR box on the top-right.
export const COMPANY_HEADER_CSS = `
  .header{border-bottom:3px solid #327F74;padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:flex-start}
  .header-left{flex:1}
  .header-left .company-logo{max-height:48px;max-width:220px;object-fit:contain;margin-bottom:8px;display:block}
  .company-name{color:#327F74;font-size:32px;font-weight:bold;margin-bottom:5px}
  .company-details{color:#888;font-size:12px;line-height:1.6}
  .qr-top-right{width:120px;height:120px;background:white;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .qr-inner{text-align:center;color:#327F74}
  .qr-inner svg{display:block;margin:0 auto;width:84px;height:84px}
  .qr-inner .qr-label{font-size:9px;font-weight:600;margin-top:5px;line-height:1.2}
  .qr-inner .qr-rcpt{font-size:9px;margin-top:3px;word-break:break-all}
`;

// Renders the receipt header: company logo + name + contact details on the
// top left of the page, a scannable verification QR on the top right.
export function buildCompanyHeaderHtml(company: CompanyDetails, receiptNo: string, qrDetails?: ReceiptQrDetails): string {
  const logoImg = company.logo
    ? `<img src="${company.logo}" alt="${escapeHtml(company.name)} logo" class="company-logo"/>`
    : "";
  const contactParts = [company.phone && `Phone: ${escapeHtml(company.phone)}`, company.email && `Email: ${escapeHtml(company.email)}`]
    .filter(Boolean)
    .join(" | ");
  const trnPart = company.trn ? `TRN: ${escapeHtml(company.trn)}` : "";
  const detailLines = [company.address && escapeHtml(company.address), contactParts, trnPart].filter(Boolean).join("<br/>");
  const qrSvg = buildQrCodeSvg(buildReceiptQrPayload(company, receiptNo, qrDetails));

  return `
  <div class="header-left">
    ${logoImg}
    <div class="company-name">${escapeHtml(company.name)}</div>
    <div class="company-details">${detailLines}</div>
  </div>
  <div class="qr-top-right">
    <div class="qr-inner">
      ${qrSvg}
      <div class="qr-label">RECEIPT VERIFICATION</div>
      <div class="qr-rcpt">${escapeHtml(receiptNo)}</div>
    </div>
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
