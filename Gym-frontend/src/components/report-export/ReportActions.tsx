import React, { useCallback, useRef, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useCurrency } from "../../utils/currency";
import { useBranch } from "../../utils/branch-context";
import { authService } from "../../utils/supabase/auth-service";
import { deliverReport, type ReportOutput } from "./service";
import type { ReportDocument } from "./types";
import styles from "./report-actions.module.css";

export type ReportSource = ReportDocument | (() => ReportDocument | Promise<ReportDocument>);

const LABEL: Record<ReportOutput, string> = { xlsx: "Excel", pdf: "PDF", print: "print layout" };

/**
 * Runs report exports for a component: resolves the active branch, currency and user, guards
 * against double clicks, and reports real outcomes (success only once the file was made).
 */
export function useReportExporter() {
  const { currencyCode, currency } = useCurrency();
  const { activeBranchName } = useBranch();
  const [busy, setBusy] = useState<ReportOutput | null>(null);
  const running = useRef(false);

  const run = useCallback(async (output: ReportOutput, source: ReportSource) => {
    if (running.current) return;
    running.current = true;
    setBusy(output);
    try {
      const report = typeof source === "function" ? await source() : source;
      if (!report) throw new Error("There is no report to export yet");
      const user = authService.getCurrentUser();
      const name = await deliverReport(report, output, {
        currencyCode,
        currencyPrefix: currency.textPrefix,
        branchName: activeBranchName || "All Branches",
        generatedBy: user?.staffName || user?.name || undefined,
      });
      if (name) toast.success(`${LABEL[output]} downloaded`, { description: name });
    } catch (err) {
      console.error(`Report ${output} failed`, err);
      toast.error(output === "print" ? "Couldn't prepare the print layout" : `Couldn't generate the ${LABEL[output]} file`, {
        description: err instanceof Error && err.message ? err.message : "Please try again.",
      });
    } finally {
      running.current = false;
      setBusy(null);
    }
  }, [currencyCode, currency.textPrefix, activeBranchName]);

  return { run, busy };
}

export interface ReportActionsProps {
  /** The report, or a builder (may be async, e.g. to page through every record of a paged list). */
  report: ReportSource;
  disabled?: boolean;
  size?: "sm" | "default";
  /** Hide the button labels below 640px (icons only). */
  compact?: boolean;
  /** Label for the dropdown header, e.g. the report name when a page has several. */
  menuLabel?: string;
  showPrint?: boolean;
  className?: string;
}

/** [ Export ▾ ] [ Print ] — the standard report controls used on every GymBios report. */
export function ReportActions({ report, disabled, size = "sm", compact, menuLabel, showPrint = true, className }: ReportActionsProps) {
  const { run, busy } = useReportExporter();
  const exporting = busy === "xlsx" || busy === "pdf";

  return (
    <div className={`${styles.group} ${compact ? styles.compact : ""} ${className ?? ""}`} data-report-actions="">
      <DropdownMenu>
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <DropdownMenuPrimitive.Trigger asChild>
              <Button variant="outline" size={size} disabled={disabled || !!busy} aria-label="Export report">
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                <span className={styles.label}>{exporting ? `Exporting ${LABEL[busy!]}…` : "Export"}</span>
                <ChevronDown className={`h-3.5 w-3.5 ${styles.chev}`} />
              </Button>
            </DropdownMenuPrimitive.Trigger>
          </TooltipTrigger>
          <TooltipContent>Download this report as Excel or PDF</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className={styles.menu}>
          <DropdownMenuLabel className={styles.menuLabel}>{menuLabel || "Export report"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={styles.item} onSelect={() => run("xlsx", report)}>
            <span className={`${styles.icon} ${styles.xlsx}`}><FileSpreadsheet className="h-4 w-4" /></span>
            <span className={styles.text}>
              <span className={styles.name}>Export to Excel</span>
              <span className={styles.desc}>.xlsx · formatted sheets, filters &amp; totals</span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem className={styles.item} onSelect={() => run("pdf", report)}>
            <span className={`${styles.icon} ${styles.pdf}`}><FileText className="h-4 w-4" /></span>
            <span className={styles.text}>
              <span className={styles.name}>Export to PDF</span>
              <span className={styles.desc}>.pdf · A4 document with charts</span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {showPrint && (
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <Button variant="outline" size={size} disabled={disabled || !!busy} onClick={() => run("print", report)} aria-label="Print report">
              {busy === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              <span className={styles.label}>Print</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Print this report (A4)</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export default ReportActions;
