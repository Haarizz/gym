export interface UserTransaction {
  id: string;
  type: 'salary' | 'bonus' | 'purchase' | 'attendance' | 'membership';
  description: string;
  amount?: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface UserTransactionSummary {
  totalEarnings: number;
  totalTransactions: number;
  totalPurchases: number;
  totalBonuses: number;
}
