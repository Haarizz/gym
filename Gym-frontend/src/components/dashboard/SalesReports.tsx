import { Activity } from 'lucide-react';
import { Skeleton } from "../ui/skeleton";
import { useCurrency } from "../../utils/currency";
import { RevenueReportsTab } from "./RevenueReports";
import { PeriodHeader, type RevenuePeriod } from "./RevenuePeriod";

/** Top plans, products and members, staff, and day / hour sales patterns. */
export function SalesReports({ period }: { period: RevenuePeriod }) {
  const { currencyCode } = useCurrency();
  const { data, isLoading } = period;
  return (
    <div className="space-y-6">
      <PeriodHeader
        period={period}
        title="Sales Reports"
        description="Best sellers, top members, staff and when sales happen"
      />
      {isLoading && !data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="w-full h-64" />
          <Skeleton className="w-full h-64" />
        </div>
      ) : data?.insights && data?.comparison ? (
        <RevenueReportsTab data={data} currencyCode={currencyCode} />
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
            <Activity className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="font-medium mb-1">No data for this period</h3>
          <p className="text-sm text-muted-foreground">Sales reports aren't available from the server yet.</p>
        </div>
      )}
    </div>
  );
}
