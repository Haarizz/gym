import { useQuery } from '@tanstack/react-query';
import { FinancialsService } from '../application/FinancialsService';
import { ApiFinancialsRepository } from '../infrastructure/ApiFinancialsRepository';
import { financialKeys } from './financialKeys';
import { useBranchContext } from "@/shared/providers/BranchProvider";

const repository = new ApiFinancialsRepository();
const financialsService = new FinancialsService(repository);

export function useFinancialDashboard() {
    const { selectedBranchId } = useBranchContext();
  return useQuery({
    queryKey: [...(Array.isArray(financialKeys.dashboard()) ? financialKeys.dashboard() : [financialKeys.dashboard()]), selectedBranchId],
    queryFn: () => financialsService.getDashboard(),
  });
}

export function useFinancialMonthlyTrend(months: number = 6) {
    const { selectedBranchId } = useBranchContext();
  return useQuery({
    queryKey: [...(Array.isArray(financialKeys.monthlyTrend(months)) ? financialKeys.monthlyTrend(months) : [financialKeys.monthlyTrend(months)]), selectedBranchId],
    queryFn: () => financialsService.getMonthlyTrend(months),
  });
}

export function useExpenseByCategory() {
    const { selectedBranchId } = useBranchContext();
  return useQuery({
    queryKey: [...(Array.isArray(financialKeys.expenseByCategory()) ? financialKeys.expenseByCategory() : [financialKeys.expenseByCategory()]), selectedBranchId],
    queryFn: () => financialsService.getExpenseByCategory(),
  });
}

export function useRevenueBySource() {
    const { selectedBranchId } = useBranchContext();
  return useQuery({
    queryKey: [...(Array.isArray(financialKeys.revenueBySource()) ? financialKeys.revenueBySource() : [financialKeys.revenueBySource()]), selectedBranchId],
    queryFn: () => financialsService.getRevenueBySource(),
  });
}
