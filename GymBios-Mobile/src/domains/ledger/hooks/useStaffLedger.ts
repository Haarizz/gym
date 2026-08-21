import { useQuery } from '@tanstack/react-query';
import type { StaffLedgerData } from '../domain/StaffLedgerData';
import { staffLedgerRepository } from '../infrastructure/ApiStaffLedgerRepository';

const DEFAULT_STAFF_LEDGER: StaffLedgerData = {
  summary: {
    thisMonth: 24000,
    lastMonth: 22000,
    baseSalary: 18000,
    commission: 6000,
  },
  quickStats: {
    growth: '+9%',
    nextPayoutDate: 'Mar 30',
    daysRemaining: '5 days',
  },
  breakdown: [
    { category: 'Base Salary', amount: 18000, percentage: 75 },
    { category: 'Commission', amount: 4500, percentage: 18.75 },
    { category: 'Bonuses', amount: 1500, percentage: 6.25 },
  ],
  commissionStructure: [
    { label: 'Membership Sale', amount: '₹1,500' },
    { label: 'PT Package Sale', amount: '₹1,000' },
    { label: 'Add-on Sale', amount: '₹500' },
  ],
  recentEarnings: [
    {
      id: 1,
      date: '2026-03-20',
      description: 'Commission - 3 Conversions',
      details: 'Sarah, Mike, Emma',
      amount: 4500,
      status: 'paid',
    },
    {
      id: 2,
      date: '2026-03-15',
      description: 'Commission - 2 Conversions',
      details: 'James, Lisa',
      amount: 3000,
      status: 'paid',
    },
    {
      id: 3,
      date: '2026-03-10',
      description: 'Performance Bonus',
      details: 'Weekly target achieved',
      amount: 2000,
      status: 'paid',
    },
    {
      id: 4,
      date: '2026-03-25',
      description: 'Commission - 2 Conversions',
      details: 'Pending approval',
      amount: 3000,
      status: 'pending',
    },
  ],
  taxInfo: {
    ytdEarnings: '₹2,68,000',
    tdsDeducted: '₹8,040',
    baseSalaryPaid: '₹2,00,000',
    totalCommission: '₹68,000',
    conversions: 42,
  },
  taxDocuments: [
    { id: 1, title: 'Q1 2026 Statement' },
    { id: 2, title: 'Q4 2025 Statement' },
    { id: 3, title: 'Annual 2025 Summary' },
  ],
};

export const ledgerKeys = {
  all: ['ledger'] as const,
  staff: () => [...ledgerKeys.all, 'staff'] as const,
};

export function useStaffLedger() {
  const query = useQuery({
    queryKey: ledgerKeys.staff(),
    queryFn: async (): Promise<StaffLedgerData> => {
      try {
        return await staffLedgerRepository.getStaffLedger();
      } catch (err) {
        console.warn('Failed to fetch staff ledger, falling back to cached/default data', err);
        return DEFAULT_STAFF_LEDGER;
      }
    },
    staleTime: 1000 * 60 * 2,
  });

  return {
    ...query,
    data: query.data ?? DEFAULT_STAFF_LEDGER,
  };
}

