import { useEffect, useState } from "react";
import { financialSettingsService } from "./supabase/financial-settings-service";
// @ts-ignore - qr.js ships no type declarations
import QRCodeGenerator from "qr.js/lib/QRCode";
// @ts-ignore - qr.js ships no type declarations
import ErrorCorrectLevel from "qr.js/lib/ErrorCorrectLevel";

export interface CompanyDetails {
  name: string;
  /** Company name in the local language (e.g. Arabic) — printed under `name`; "" if not set. */
  nameLocal: string;
  address: string;
  email: string;
  phone: string;
  logo: string; // data URL, or "" if none uploaded
  /** Company stamp image (data URL, or "") printed on purchase documents. */
  stamp: string;
  /** UAE FTA Tax Registration Number — required on any document titled "Tax Invoice". */
  trn: string;
  /** false when `address` is the built-in fallback, not something the gym saved (reports omit it). */
  addressSet?: boolean;
}

const DEFAULT_COMPANY: CompanyDetails = {
  name: "GymBios",
  nameLocal: "",
  address: "Dubai, United Arab Emirates",
  email: "",
  phone: "",
  logo: "",
  stamp: "",
  trn: "",
};

// Company details are branch-scoped (each branch saves its own on the Settings
// page), so the cache is keyed by branch. They rarely change and are needed on
// every print, so each branch is fetched once per session; settings.tsx calls
// invalidateCompanyDetailsCache() after a successful save.
const cached = new Map<string, CompanyDetails>();
const inflight = new Map<string, Promise<CompanyDetails>>();

function activeBranchKey(): string {
  const id = sessionStorage.getItem("activeBranchId");
  return id && id !== "null" && id !== "undefined" ? id : "default";
}

/**
 * Company details for `branchId` — the branch a document was raised in — or,
 * when omitted, for the active branch. A document always prints its own
 * branch's header, whichever branch the user happens to be viewing.
 */
export async function getCompanyDetails(branchId?: number | null): Promise<CompanyDetails> {
  const key = branchId != null ? String(branchId) : activeBranchKey();
  const hit = cached.get(key);
  if (hit) return hit;
  const pending = inflight.get(key);
  if (pending) return pending;

  const request = Promise.all([
    financialSettingsService.getSettings("COMPANY", branchId),
    // A branch switched to "not VAT registered" (Settings › Tax Configuration) prints no TRN.
    financialSettingsService.getSettings("BRANCH_TAX", branchId).catch(() => []),
  ])
    .then(([settings, taxSettings]) => {
      const details: CompanyDetails = { ...DEFAULT_COMPANY, addressSet: false };
      settings.forEach(s => {
        if (!s.settingValue) return;
        if (s.settingKey === "company_name") details.name = s.settingValue;
        if (s.settingKey === "company_name_local") details.nameLocal = s.settingValue.trim();
        if (s.settingKey === "company_address") { details.address = s.settingValue; details.addressSet = true; }
        if (s.settingKey === "company_email") details.email = s.settingValue;
        if (s.settingKey === "company_phone") details.phone = s.settingValue;
        if (s.settingKey === "company_logo") details.logo = s.settingValue;
        if (s.settingKey === "company_stamp") details.stamp = s.settingValue;
        if (s.settingKey === "company_trn") details.trn = s.settingValue;
      });
      const registered = taxSettings.find(s => s.settingKey === "vat_registered")?.settingValue;
      if (String(registered).toLowerCase() === "false") details.trn = "";
      cached.set(key, details);
      return details;
    })
    .catch(err => {
      // e.g. no access to that branch — its header can't be read, so fall back.
      console.error("Failed to load company details, using defaults", err);
      return branchId != null ? getCompanyDetails() : DEFAULT_COMPANY;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}

export function invalidateCompanyDetailsCache() {
  cached.clear();
  // Tells mounted screens (e.g. "Tax Invoice" / "Invoice" buttons) to re-read the details.
  if (typeof window !== "undefined") window.dispatchEvent(new Event(COMPANY_DETAILS_CHANGED));
}

const COMPANY_DETAILS_CHANGED = "companyDetailsChanged";

/**
 * A document may only be titled "Tax Invoice" when it carries a TRN — i.e. the branch has a
 * TRN and is VAT registered (getCompanyDetails blanks `trn` when Tax Configuration says it
 * isn't). Otherwise it is a plain "Invoice".
 */
export function isTaxInvoice(company: Pick<CompanyDetails, "trn"> | null | undefined): boolean {
  return !!company?.trn?.trim();
}

/** "Tax Invoice" when the branch has a TRN, else "Invoice". */
export function invoiceTitle(company: Pick<CompanyDetails, "trn"> | null | undefined): string {
  return isTaxInvoice(company) ? "Tax Invoice" : "Invoice";
}

/** Arabic counterpart of invoiceTitle(): فاتورة ضريبية (tax invoice) or فاتورة (invoice). */
export function invoiceTitleArabic(company: Pick<CompanyDetails, "trn"> | null | undefined): string {
  return isTaxInvoice(company) ? "فاتورة ضريبية" : "فاتورة";
}

/**
 * The active branch's invoice title for on-screen labels ("Tax Invoice" / "Invoice"); follows
 * branch switches and Settings saves. Reads "Invoice" until the details have loaded.
 */
export function useInvoiceTitle(): string {
  const [title, setTitle] = useState(() => {
    const hit = cached.get(activeBranchKey());
    return hit ? invoiceTitle(hit) : "Invoice";
  });
  useEffect(() => {
    let alive = true;
    const read = () => { getCompanyDetails().then(c => { if (alive) setTitle(invoiceTitle(c)); }).catch(() => {}); };
    read();
    window.addEventListener("branchChanged", read);
    window.addEventListener(COMPANY_DETAILS_CHANGED, read);
    return () => {
      alive = false;
      window.removeEventListener("branchChanged", read);
      window.removeEventListener(COMPANY_DETAILS_CHANGED, read);
    };
  }, []);
  return title;
}

/**
 * Fonts for the local-language company name. Plus Jakarta has no Arabic glyphs, so name fonts
 * that do — on Windows, macOS/iOS and Android — before the generic fallback.
 */
export const LOCAL_NAME_FONT_STACK =
  "'Segoe UI', 'Noto Sans Arabic', 'Noto Naskh Arabic', Tahoma, 'Geeza Pro', 'Arabic UI Text', Arial, sans-serif";

/** Any Arabic-script character (Arabic, Supplement, Extended-A, Presentation Forms A/B). */
export const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

/**
 * The local-language name as print HTML: dir="auto" lays Arabic out right-to-left (and any
 * left-to-right script as usual) and isolates it from the surrounding text. "" when not set.
 */
export function companyLocalNameHtml(company: CompanyDetails, className = "company-name-local"): string {
  if (!company.nameLocal) return "";
  const lang = ARABIC_SCRIPT.test(company.nameLocal) ? ` lang="ar"` : "";
  // text-align:left keeps it directly under the company name — on its own, dir="auto" lines an
  // Arabic name up on the right edge of the header (beside the QR) instead.
  return `<div class="${className}" dir="auto"${lang} style="font-family:${LOCAL_NAME_FONT_STACK};unicode-bidi:isolate;text-align:left">${escapeHtml(company.nameLocal)}</div>`;
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
export function buildQrCodeSvg(value: string): string {
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
export function buildReceiptQrPayload(company: CompanyDetails, receiptNo: string, details?: ReceiptQrDetails): string {
  const lines = [
    `${company.name} - ${invoiceTitle(company)}`,
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
  .header{border-bottom:3px solid var(--rc-primary, #327F74);padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:flex-start}
  .header-left{flex:1}
  .header-left .company-logo{max-height:48px;max-width:220px;object-fit:contain;margin-bottom:8px;display:block}
  .company-name{color:var(--rc-primary, #327F74);font-size:32px;font-weight:bold;margin-bottom:5px}
  .company-name-local{color:var(--rc-primary, #327F74);font-size:22px;font-weight:700;line-height:1.35;margin:-2px 0 6px}
  .company-details{color:#888;font-size:12px;line-height:1.6}
  .qr-top-right{width:120px;height:120px;background:white;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .qr-inner{text-align:center;color:var(--rc-primary, #327F74)}
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
    ${companyLocalNameHtml(company)}
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
    <strong>${escapeHtml(company.name)}</strong>${company.nameLocal ? ` · <bdi dir="auto" style="font-family:${LOCAL_NAME_FONT_STACK}">${escapeHtml(company.nameLocal)}</bdi>` : ""}<br/>
    ${[company.address && escapeHtml(company.address), contactParts].filter(Boolean).join(" | ")}
    ${trnPart ? `<br/>${trnPart}` : ""}
  `;
}
