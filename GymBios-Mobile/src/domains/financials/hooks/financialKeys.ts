export const financialKeys = {
  all: ['financials'] as const,
  dashboard: () => [...financialKeys.all, 'dashboard'] as const,
  monthlyTrend: (months: number = 6) => [...financialKeys.all, 'monthly-trend', months] as const,
  expenseByCategory: () => [...financialKeys.all, 'expense-by-category'] as const,
  revenueBySource: () => [...financialKeys.all, 'revenue-by-source'] as const,
};
