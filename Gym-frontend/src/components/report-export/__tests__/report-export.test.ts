import { describe, expect, it } from "vitest";
import { displayValue, tableFromMatrix } from "../builders";
import { buildFileName, computeTotals, formatValue, plainText, resolveOrientation } from "../format";
import type { ReportContext, ReportDocument } from "../types";

const ctx = { currencyPrefix: "AED " };

describe("displayValue", () => {
  it("parses on-screen money (Dirham glyph, codes, symbols, compact, negatives)", () => {
    expect(displayValue("⃃12,400")).toEqual({ value: 12400, format: "money" });
    expect(displayValue("AED 1,250.50")).toEqual({ value: 1250.5, format: "money" });
    expect(displayValue("$1.2K")).toEqual({ value: 1200, format: "money" });
    expect(displayValue("-AED 300")).toEqual({ value: -300, format: "money" });
    expect(displayValue("AED -300")).toEqual({ value: -300, format: "money" });
  });
  it("parses percent, integers and decimals; leaves text alone", () => {
    expect(displayValue("93.5%")).toEqual({ value: 93.5, format: "percent" });
    expect(displayValue("1,204")).toEqual({ value: 1204, format: "integer" });
    expect(displayValue("4.25")).toEqual({ value: 4.25, format: "number" });
    expect(displayValue("12 min")).toEqual({ value: "12 min", format: "text" });
    expect(displayValue("—")).toEqual({ value: "—", format: "text" });
  });
});

describe("formatValue", () => {
  it("formats money with the plain currency prefix and sign first", () => {
    expect(formatValue(1234.5, "money", ctx)).toBe("AED 1,234.50");
    expect(formatValue(-50, "money", ctx)).toBe("-AED 50.00");
    expect(formatValue(12.345, "percent", ctx)).toBe("12.3%");
    expect(formatValue(85, "duration", ctx)).toBe("1h 25m");
    expect(formatValue("2026-11-06", "date", ctx)).toBe("06 Nov 2026");
  });
  it("never leaks the on-screen Dirham glyph", () => {
    expect(plainText("⃃ 1,000")).toBe("AED 1,000");
    expect(formatValue("Total ⃃500", "text", ctx)).toBe("Total AED 500");
  });
});

describe("totals and tables", () => {
  it("totals only data rows", () => {
    const t = computeTotals(
      [{ key: "name", header: "Name" }, { key: "amt", header: "Amount", format: "money", total: "sum" }],
      [{ name: "a", amt: 10 }, { name: "b", amt: 5.5 }, { _kind: "subtotal", name: "sub", amt: 15.5 }],
    );
    expect(t).toEqual({ name: "Total", amt: 15.5 });
  });
  it("infers column types from a CSV-style matrix", () => {
    const s = tableFromMatrix("T", ["Member", "Date", "Amount", "Visits", "Share"], [["A", "2026-11-01", "120.50", 3, "40%"], ["B", "2026-11-02", 80, 2, "60%"]], { totals: true });
    expect(s.columns.map((c) => c.format)).toEqual(["text", "date", "money", "integer", "percent"]);
    expect(s.rows[0]).toMatchObject({ c2: 120.5, c4: 40 });
    expect(s.columns[2].total).toBe("sum");
    expect(s.columns[3].total).toBe("sum");
  });
});

describe("document rules", () => {
  const base: ReportDocument = { title: "Revenue", sections: [] };
  it("builds descriptive file names", () => {
    const c = { company: { name: "Power Gym" }, generatedAt: new Date(2026, 10, 6) } as unknown as ReportContext;
    expect(buildFileName(base, c, "pdf")).toBe("Power_Gym_Revenue_Report_2026-11-06.pdf");
    expect(buildFileName({ ...base, title: "Statement of Account" }, c, "xlsx")).toBe("Power_Gym_Statement_of_Account_2026-11-06.xlsx");
  });
  it("switches wide tables to landscape", () => {
    const narrow = { ...base, sections: [tableFromMatrix("t", ["A", "B"], [["x", 1]])] };
    const wide = { ...base, sections: [tableFromMatrix("t", Array.from({ length: 12 }, (_, i) => `Column header ${i}`), [Array.from({ length: 12 }, () => "a long-ish value")])] };
    expect(resolveOrientation(narrow)).toBe("portrait");
    expect(resolveOrientation(wide)).toBe("landscape");
  });
});
