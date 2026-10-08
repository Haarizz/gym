import React from "react";
import { ApprovalProvider } from "./components/Approval";
import { PosProvider, usePos } from "./PosContext";
import { Dashboard } from "./Dashboard";
import { Terminal } from "./Terminal";
import { XReportView } from "./XReportView";
import { ZReportView } from "./ZReportView";
import { CustomersView } from "./CustomersView";
import { ConsoleView } from "./ConsoleView";
import { AnalyticsView } from "./AnalyticsView";

/**
 * GymBios Point of Sale — ported from BillBull's POS module: per-cashier sessions
 * with float and closing count, a full-screen selling terminal (barcode, holds,
 * returns, discounts with supervisor approval, split tenders, credit to member
 * accounts), X/Z reports with day close, customer credit collection, analytics and
 * a console for settings, receipt design, printers (browser / print agent /
 * network ESC/POS) and the audit trail.
 */
function Views() {
  const { view, session } = usePos();
  switch (view) {
    case "terminal":
      return session ? <Terminal /> : <Dashboard />;
    case "x-report":
      return <XReportView />;
    case "z-report":
      return <ZReportView />;
    case "customers":
      return <CustomersView />;
    case "console":
      return <ConsoleView />;
    case "analytics":
      return <AnalyticsView />;
    default:
      return <Dashboard />;
  }
}

export function PosApp() {
  return (
    <PosProvider>
      <ApprovalProvider>
        <Views />
      </ApprovalProvider>
    </PosProvider>
  );
}
