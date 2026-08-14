import { useQuery } from '@tanstack/react-query';
import { FinancialsService } from '../application/FinancialsService';
import { ApiFinancialsRepository } from '../infrastructure/ApiFinancialsRepository';
import { financialKeys } from './financialKeys';

const repository = new ApiFinancialsRepository();
const financialsService = new FinancialsService(repository);

export function useFinancialDashboard() {
  return useQuery({
    queryKey: financialKeys.dashboard(),
    queryFn: () => financialsService.getDashboard(),
  });
}

export function useFinancialMonthlyTrend(months: number = 6) {
  return useQuery({
    queryKey: financialKeys.monthlyTrend(months),
    queryFn: () => financialsService.getMonthlyTrend(months),
  });
}

export function useExpenseByCategory() {
  return useQuery({
    queryKey: financialKeys.expenseByCategory(),
    queryFn: () => financialsService.getExpenseByCategory(),
  });
}

export function useRevenueBySource() {
  return useQuery({
    queryKey: financialKeys.revenueBySource(),
    queryFn: () => financialsService.getRevenueBySource(),
  });
}
