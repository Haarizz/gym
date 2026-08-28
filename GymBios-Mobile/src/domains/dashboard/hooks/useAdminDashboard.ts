import { useQuery } from '@tanstack/react-query';
import { BrandColors } from '@/core/theme';
import type { AdminDashboardData, AdminReportType } from '../domain/AdminDashboardData';

const DEFAULT_ADMIN_DASHBOARD: AdminDashboardData = {
  branch: 'All Branches',
  dateText: 'Today: March 26, 2026',
  kpis: [
    { id: 'total-collections', label: 'Total Collections', value: '₹2.4L', change: '+12%', trend: 'up', icon: 'dollar-sign', color: '#22C55E', clickable: true },
    { id: 'membership-sales', label: 'Membership Sales', value: '₹1.8L', change: '+8%', trend: 'up', icon: 'user-check', color: BrandColors.teal, clickable: true },
    { id: 'pos-revenue', label: 'POS Revenue', value: '₹52K', change: '+18%', trend: 'up', icon: 'shopping-bag', color: BrandColors.memberGold, clickable: true },
    { id: 'pt-sales', label: 'PT Sales', value: '₹45K', change: '+15%', trend: 'up', icon: 'users', color: BrandColors.trainerAmber, clickable: true },
    { id: 'day-pass', label: 'Day Pass Revenue', value: '₹12K', change: '-3%', trend: 'down', icon: 'credit-card', color: '#3B82F6', clickable: true },
    { id: 'check-ins', label: 'Total Check-ins', value: '342', change: '+5%', trend: 'up', icon: 'trending-up', color: '#A855F7', clickable: false },
    { id: 'active-members', label: 'Active Members', value: '1,245', change: '+2%', trend: 'up', icon: 'users', color: BrandColors.teal, clickable: true },
    { id: 'churn-rate', label: 'Churn Rate', value: '3.2%', change: '-0.5%', trend: 'up', icon: 'user-minus', color: '#EF4444', clickable: true },
    { id: 'retention-rate', label: 'Retention Rate', value: '89.4%', change: '+1.2%', trend: 'up', icon: 'user-plus', color: '#16A34A', clickable: true },
  ],
  paymentMix: [
    { mode: 'Card', amount: '₹1.2L', percentage: 50, color: BrandColors.teal },
    { mode: 'Cash', amount: '₹72K', percentage: 30, color: BrandColors.memberGold },
    { mode: 'Online', amount: '₹36K', percentage: 15, color: BrandColors.trainerAmber },
    { mode: 'Other', amount: '₹12K', percentage: 5, color: '#94A3B8' },
  ],
  alerts: [
    { text: '24 memberships expiring in 7 days', urgent: true },
    { text: '12 pending follow-ups for today', urgent: false },
  ],
  highlights: [
    { label: 'Staff Attendance', value: '18/20' },
    { label: "Today's Footfall", value: '342 visits' },
    { label: 'Renewals Due (7 days)', value: '24 members', color: '#EF4444' },
    { label: 'Pending Follow-ups', value: '12 leads', color: '#CA8A04' },
  ],
};

export const adminDashboardKeys = {
  all: ['dashboard', 'admin'] as const,
};

export function getAdminReportTitle(reportType: AdminReportType): string {
  const titles: Record<string, string> = {
    'total-collections': 'Total Collections Report',
    'membership-sales': 'Membership Sales Report',
    'pos-revenue': 'POS Revenue Report',
    'pt-sales': 'PT Sales Report',
    'day-pass': 'Day Pass Revenue Report',
    'active-members': 'Active Members Report',
    'churn-rate': 'Churn Rate Analysis',
    'retention-rate': 'Retention Rate Analysis',
  };
  return titles[reportType || ''] || 'Report Detail';
}

export function getAdminReportColumns(reportType: AdminReportType): string[] {
  switch (reportType) {
    case 'total-collections':
      return ['Branch', 'Amount', 'Txns', 'Growth'];
    case 'membership-sales':
      return ['Plan', 'Sales', 'Count', 'Growth'];
    case 'pos-revenue':
      return ['Category', 'Sales', 'Units', 'Growth'];
    case 'pt-sales':
      return ['Trainer', 'Sales', 'Sessions', 'Growth'];
    case 'day-pass':
      return ['Date', 'Passes', 'Revenue', 'Peak'];
    case 'active-members':
      return ['Plan', 'Count', 'Share', 'Change'];
    case 'churn-rate':
      return ['Month', 'Rate', 'Members', 'Reason'];
    case 'retention-rate':
      return ['Segment', 'Rate', 'Count', 'Trend'];
    default:
      return [];
  }
}

export function getAdminReportData(reportType: AdminReportType): Array<Record<string, string | number>> {
  switch (reportType) {
    case 'total-collections':
      return [
        { c1: 'Downtown', c2: '₹1.2L', c3: 145, c4: '+15%' },
        { c1: 'Uptown', c2: '₹85K', c3: 98, c4: '+8%' },
        { c1: 'Central', c2: '₹55K', c3: 67, c4: '+12%' },
      ];
    case 'membership-sales':
      return [
        { c1: 'Annual Premium', c2: '₹95K', c3: 12, c4: '+20%' },
        { c1: 'Quarterly Gold', c2: '₹48K', c3: 18, c4: '+5%' },
        { c1: 'Monthly Basic', c2: '₹37K', c3: 35, c4: '+3%' },
      ];
    case 'pos-revenue':
      return [
        { c1: 'Supplements', c2: '₹28K', c3: 156, c4: '+22%' },
        { c1: 'Apparel', c2: '₹15K', c3: 45, c4: '+15%' },
        { c1: 'Accessories', c2: '₹9K', c3: 89, c4: '+12%' },
      ];
    case 'pt-sales':
      return [
        { c1: 'Raj Kumar', c2: '₹18K', c3: 24, c4: '+18%' },
        { c1: 'Priya Singh', c2: '₹15K', c3: 20, c4: '+12%' },
        { c1: 'Amit Sharma', c2: '₹12K', c3: 16, c4: '+15%' },
      ];
    case 'day-pass':
      return [
        { c1: '25 Mar', c2: 18, c3: '₹4.5K', c4: '6-8 PM' },
        { c1: '24 Mar', c2: 22, c3: '₹5.5K', c4: '6-8 PM' },
        { c1: '23 Mar', c2: 15, c3: '₹3.8K', c4: '5-7 PM' },
      ];
    case 'active-members':
      return [
        { c1: 'Premium', c2: 542, c3: '43.5%', c4: '+3%' },
        { c1: 'Gold', c2: 398, c3: '32.0%', c4: '+2%' },
        { c1: 'Basic', c2: 305, c3: '24.5%', c4: '+1%' },
      ];
    case 'churn-rate':
      return [
        { c1: 'March', c2: '3.2%', c3: 40, c4: 'Relocation' },
        { c1: 'February', c2: '3.7%', c3: 45, c4: 'Cost' },
        { c1: 'January', c2: '4.1%', c3: 52, c4: 'Dissatisfied' },
      ];
    case 'retention-rate':
      return [
        { c1: 'Premium Members', c2: '95.2%', c3: 516, c4: '+2%' },
        { c1: 'Gold Members', c2: '88.5%', c3: 352, c4: '+1%' },
        { c1: 'Basic Members', c2: '82.1%', c3: 251, c4: '-1%' },
      ];
    default:
      return [];
  }
}

export function useAdminDashboard() {
  const query = useQuery({
    queryKey: adminDashboardKeys.all,
    queryFn: async (): Promise<AdminDashboardData> => {
      return DEFAULT_ADMIN_DASHBOARD;
    },
    staleTime: 1000 * 60 * 2,
  });

  return {
    ...query,
    data: query.data ?? DEFAULT_ADMIN_DASHBOARD,
  };
}
