import { Skeleton } from "../ui/skeleton";
import { useCurrency } from "../../utils/currency";
import { ComparisonHub } from "./RevenueOperations";
import { PeriodHeader, type RevenuePeriod } from "./RevenuePeriod";

/** Whole-gym period comparison: revenue, members, attendance, bookings, POS, CRM, freezes, targets. */
export function BusinessInsights({ period }: { period: RevenuePeriod }) {
  const { currencyCode } = useCurrency();
  return (
    <div className="space-y-6">
      <PeriodHeader
        period={period}
        title="Business Insights"
        description="How every part of the gym moved compared with an earlier period"
      />
      {period.isLoading && !period.data ? (
        <Skeleton className="w-full h-64" />
      ) : (
        <ComparisonHub
          summary={period.data}
          from={period.fromKey}
          to={period.toKey}
          granularity={period.granularity}
          compare={period.compareMode}
          refreshKey={period.refreshKey}
          currencyCode={currencyCode}
        />
      )}
    </div>
  );
}
