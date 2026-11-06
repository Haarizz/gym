import React, { useRef } from "react";
import type { BiosLiveData } from "./bios-live";
import {
  ReportActions, type ReportDocument, type ReportSection, changeHint, chartFromRows, col, countCol, kpiSection, moneyCol, pieSection, tableSection,
} from "../report-export";
import { domTableSections } from "../report-export/dom-tables";

export type BiosReportKind = "kpi" | "executive" | "revenue" | "member" | "performance" | "benchmarking" | "predictive" | "summary" | "bi-engine";

const TITLES: Record<BiosReportKind, string> = {
  kpi: "BiOS KPI Report",
  executive: "BiOS Executive Dashboard",
  revenue: "BiOS Revenue Analytics",
  member: "BiOS Member Analytics",
  performance: "BiOS Performance Metrics",
  benchmarking: "BiOS Benchmarking",
  predictive: "BiOS Predictive Analytics",
  summary: "BiOS Business Summary",
  "bi-engine": "BiOS BI Engine Report",
};

/**
 * A BiOS report from the same live figures the BiOS page and its dialogs read, plus the tables the
 * open dialog is showing (its own insight fetches) read back from the dialog itself.
 */
export function buildBiosReport(live: BiosLiveData, kind: BiosReportKind, dialog?: Element | null, extra: ReportSection[] = []): ReportDocument {
  if (!live.hasLiveData) throw new Error("BiOS data is still loading");
  const now = new Date();
  const headline = kpiSection([
    { label: "Total revenue", value: live.totalRevenue, format: "money", ...changeHint(live.revenueGrowthRate, "vs last month") },
    { label: "Net income", value: live.netIncome, format: "money", hint: `${live.profitMargin.toFixed(1)}% margin` },
    { label: "Active members", value: live.activeMembers, format: "integer", ...changeHint(live.memberGrowthRate, "vs last month") },
    { label: "Retention", value: live.retentionRate, format: "percent", hint: `${live.retentionDelta >= 0 ? "+" : ""}${live.retentionDelta.toFixed(1)} pts vs last month` },
    { label: "Health score", value: live.overallHealthScore, format: "integer", hint: live.overallHealthLabel },
    { label: "Revenue per member", value: live.revenuePerMember, format: "money" },
    { label: "Check-ins today", value: live.todayCheckIns, format: "integer", hint: `avg ${Math.round(live.avgSessionMinutes)} min session` },
    { label: "Monthly revenue target", value: live.monthlyRevenueTarget ?? "Not set", format: "money" },
  ], "Headline");
  const trend = [
    chartFromRows("Revenue, expenses and profit by month", "bar", live.monthlyTrend, "month", [
      { key: "revenue", name: "Revenue", color: "#2a78d6" }, { key: "expenses", name: "Expenses", color: "#eb6834" }, { key: "profit", name: "Profit", color: "#1baf7a" },
    ], { valueFormat: "money" }),
    tableSection("Monthly trend", [col("month", "Month"), moneyCol("revenue", "Revenue"), moneyCol("expenses", "Expenses"), moneyCol("profit", "Profit")], live.monthlyTrend, { totals: true }),
  ];
  const revenue = [
    pieSection("Revenue by source", live.revenueSources.map((s) => ({ label: s.source, value: s.amount })), { valueFormat: "money" }),
    tableSection("Revenue by source", [col("source", "Source"), moneyCol("amount", "Amount"), col("percentage", "Share", "percent", { total: "sum" })], live.revenueSources, { totals: true }),
    tableSection("Expenses by category", [col("category", "Category"), moneyCol("amount", "Amount")],
      Object.entries(live.expensesByCategory).map(([category, amount]) => ({ category, amount })), { totals: true }),
  ];
  const members = [
    chartFromRows("Members, retention and churn", "line", live.memberTrend, "month", [{ key: "members", name: "Members", color: "#2a78d6" }], { valueFormat: "integer" }),
    tableSection("Member trend", [col("month", "Month"), col("members", "Members", "integer"), countCol("newMembers", "New"), col("retention", "Retention", "percent"), col("churn", "Churn", "percent")], live.memberTrend, { totals: true }),
    tableSection("Membership types", [col("type", "Type"), countCol("total", "Members"), countCol("active", "Active"), countCol("expired", "Expired")],
      Object.entries(live.membershipTypeStats).map(([type, s]) => ({ type, ...s })), { totals: true }),
    { kind: "keyValue" as const, title: "Member status", items: [
      { label: "Total members", value: live.totalMembers, format: "integer" as const },
      { label: "Joined recently", value: live.recentJoins, format: "integer" as const },
      { label: "Expired", value: live.expiredMembers, format: "integer" as const },
      { label: "Overdue", value: live.overdueMembers, format: "integer" as const },
      { label: "Suspended", value: live.suspendedMembers, format: "integer" as const },
    ] },
  ];
  const operations = [
    chartFromRows("Peak hours", "bar", live.peakHours.map(([hour, n]) => ({ hour, n })), "hour", [{ key: "n", name: "Check-ins", color: "#2a78d6" }], { valueFormat: "integer" }),
    tableSection("Top staff", [col("staff_name", "Staff"), moneyCol("revenue_target", "Target"), moneyCol("revenue_achieved", "Achieved"), col("percentage", "Progress", "percent")], live.topStaff, { totals: true }),
  ];
  const branches = live.branchComparison.length
    ? [tableSection("Branch comparison", Object.keys(live.branchComparison[0]).filter((k) => typeof (live.branchComparison[0] as any)[k] !== "object").map((k) => {
        const sample = (live.branchComparison[0] as any)[k];
        const money = /revenue|expense|income|profit|amount|value/i.test(k);
        return col(k, k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), typeof sample === "number" ? (money ? "money" : /rate|percent|pct|margin/i.test(k) ? "percent" : "number") : "text");
      }), live.branchComparison as unknown as object[])]
    : [];

  const plan: Record<BiosReportKind, ReportSection[]> = {
    kpi: [headline, ...trend, ...revenue, ...operations],
    executive: [headline, ...trend, ...branches],
    revenue: [headline, ...trend, ...revenue],
    member: [headline, ...members],
    performance: [headline, ...operations, ...members.slice(0, 2)],
    benchmarking: [headline, ...branches],
    predictive: [headline, ...trend, ...members.slice(0, 2)],
    summary: [headline, ...trend, ...revenue, ...members, ...operations, ...branches],
    "bi-engine": [headline, ...trend, ...revenue, ...members, ...operations, ...branches],
  };
  const fromDialog = domTableSections(dialog);
  return {
    title: TITLES[kind],
    period: { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now, label: now.toLocaleDateString(undefined, { month: "long", year: "numeric" }) },
    sections: [...plan[kind], ...extra, ...fromDialog.map((t) => ({ ...t, title: `${t.title} (as shown)` }))],
  };
}

/** Export ▾ + Print for a BiOS dialog: reads the open dialog's tables at click time. */
export function BiosReportActions({ live, kind, compact, extra, readDialog = true }: {
  live: BiosLiveData; kind: BiosReportKind; compact?: boolean;
  /** Dialog-specific datasets (structured) to add after the shared sections. */
  extra?: () => ReportSection[];
  /** Also read the tables the open dialog shows (off when `extra` already covers them). */
  readDialog?: boolean;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  return (
    <span ref={anchor} style={{ display: "inline-flex" }}>
      <ReportActions
        report={() => buildBiosReport(live, kind, readDialog ? anchor.current?.closest('[role="dialog"]') : null, extra?.() ?? [])}
        disabled={!live.hasLiveData}
        size="default"
        compact={compact}
        menuLabel={TITLES[kind]}
      />
    </span>
  );
}
