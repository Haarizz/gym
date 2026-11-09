import { downloadBlob } from "../../utils/xlsx-export";
import { loadReportCompany } from "./company";
import { buildFileName } from "./format";
import type { ReportContext, ReportDocument } from "./types";

export type ReportOutput = "xlsx" | "pdf" | "print";

export interface ContextInput {
  currencyCode: string;
  currencyPrefix: string;
  branchName: string;
  generatedBy?: string;
}

export async function resolveReportContext(report: ReportDocument, input: ContextInput): Promise<ReportContext> {
  const company = await loadReportCompany(report.companyBranchId);
  return {
    company,
    currencyCode: input.currencyCode,
    currencyPrefix: input.currencyPrefix,
    branchName: input.branchName,
    generatedBy: input.generatedBy,
    generatedAt: new Date(),
  };
}

/**
 * Builds and delivers a report: downloads the .xlsx / .pdf (resolving with its file name), or opens
 * the print dialog. The renderers are loaded on first use so jsPDF never weighs on the app bundle.
 * Throws on failure — callers show the error; nothing reports success unless the file was made.
 */
export async function deliverReport(report: ReportDocument, output: ReportOutput, input: ContextInput): Promise<string | null> {
  const ctx = await resolveReportContext(report, input);
  if (output === "print") {
    const { printReport } = await import("./print");
    printReport(report, ctx);
    return null;
  }
  const blob = output === "pdf"
    ? await (await import("./pdf")).buildReportPdf(report, ctx)
    : await (await import("./excel")).buildReportExcel(report, ctx);
  if (!blob || !blob.size) throw new Error("The file came out empty");
  const name = buildFileName(report, ctx, output);
  downloadBlob(blob, name);
  return name;
}
