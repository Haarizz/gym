const ledger = {
  ledger: {
    loading: 'Loading ledger...',
    errorTitle: "Couldn't load your ledger",
    errorNetwork: 'Check your connection and try again.',
    errorEmpty: 'No ledger data is available yet.',
    retry: 'Retry',

    tabs: {
      breakdown: 'Breakdown',
      earnings: 'Earnings',
      transactions: 'Transactions',
      tax: 'Tax Info',
    },

    summary: {
      title: 'Earnings Summary',
      thisMonth: 'This Month',
      lastMonth: 'Last Month',
      baseSalary: 'Base Salary',
      commission: 'Commission',
      paid: 'Paid',
      pending: 'Pending',
    },

    stats: {
      growth: 'Growth',
      noEarningsLastMonth: 'No earnings last month',
      vsLastMonth: 'vs last month',
      nextPayout: 'Next Payout',
    },

    breakdown: {
      title: 'Earnings Breakdown',
      commissionStructureTitle: 'Commission Structure',
      monthlyComparisonTitle: 'Monthly Comparison',
    },

    earnings: {
      recentEarningsTitle: 'Recent Earnings',
      recentTransactionsTitle: 'Recent Transactions',
      viewAll: 'View All',
      noEarningsEmpty: 'No earnings yet. Salary payments and commission from your sales will appear here.',
      noTransactionsEmpty: 'No transactions yet. Salary payments and commission from your sales will appear here.',
      statusPaid: 'PAID',
      statusPending: 'PENDING',
      downloadSalarySlip: 'Download Salary Slip',
      downloadReport: 'Download Report',
      viewDetails: 'View Details',
      salarySlipSuccessTitle: 'Salary Slip Ready',
      salarySlipSuccessDesc: 'Your salary slip advice has been generated successfully.',
      salarySlipNoticeTitle: 'Download Notice',
      salarySlipNoticeDesc: 'Your salary slip advice is being prepared by HR.',
      taxDocSuccessTitle: 'Tax Document Ready',
      taxDocSuccessDesc: '{{title}} is ready for viewing.',
      taxDocNoticeTitle: 'Document Notice',
      taxDocNoticeDesc: '{{title}} will be provided once filed by the compliance team.',
      downloadA11y: 'Download {{title}}',
    },

    tax: {
      title: 'Tax Information',
      ytdEarningsWithTds: 'Your YTD earnings: {{earnings}}. TDS deducted: {{tds}}',
      ytdEarnings: 'Your YTD earnings: {{earnings}}.',
      viewTaxDetails: 'View Tax Details →',
      summaryTitle: 'Year to Date Summary',
      totalEarnings: 'Total Earnings',
      salaryPaid: 'Salary Paid',
      totalCommission: 'Total Commission',
      conversions: 'Conversions',
      totalSessions: 'Total Sessions',
      avgPerSession: 'Avg. per Session',
      activeClients: 'Active Clients',
      documentsTitle: 'Tax Documents',
      noDocumentsEmpty: 'No tax documents have been issued yet.',
    },
  },
};

export default ledger;
