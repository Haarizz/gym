const ledger = {
  ledger: {
    loading: '正在加载账本...',
    errorTitle: '无法加载您的账本',
    errorNetwork: '请检查网络连接后重试。',
    errorEmpty: '暂无账本数据。',
    retry: '重试',

    tabs: {
      breakdown: '明细',
      earnings: '收入',
      transactions: '交易明细',
      tax: '税务信息',
    },

    summary: {
      title: '收入总览',
      thisMonth: '本月',
      lastMonth: '上月',
      baseSalary: '基本工资',
      commission: '提成',
      paid: '已发放',
      pending: '待发放',
    },

    stats: {
      growth: '增长',
      noEarningsLastMonth: '上月无收入',
      vsLastMonth: '较上月',
      nextPayout: '下次发薪日',
    },

    breakdown: {
      title: '收入明细',
      commissionStructureTitle: '提成规则',
      monthlyComparisonTitle: '月度对比',
    },

    earnings: {
      recentEarningsTitle: '近期收入',
      recentTransactionsTitle: '近期交易',
      viewAll: '查看全部',
      noEarningsEmpty: '暂无收入记录。工资发放和销售提成将显示在此处。',
      noTransactionsEmpty: '暂无交易记录。工资发放和销售提成将显示在此处。',
      statusPaid: '已发放',
      statusPending: '待发放',
      downloadSalarySlip: '下载工资条',
      downloadReport: '下载报表',
      viewDetails: '查看详情',
      salarySlipSuccessTitle: '工资条已就绪',
      salarySlipSuccessDesc: '您的工资条通知已成功生成。',
      salarySlipNoticeTitle: '下载提示',
      salarySlipNoticeDesc: '人事部门正在准备您的工资条。',
      taxDocSuccessTitle: '税务文档已就绪',
      taxDocSuccessDesc: '{{title}} 已可供查看。',
      taxDocNoticeTitle: '文档提示',
      taxDocNoticeDesc: '合规团队归档后将提供 {{title}}。',
      downloadA11y: '下载 {{title}}',
    },

    tax: {
      title: '税务信息',
      ytdEarningsWithTds: '本年度累计收入：{{earnings}}。已扣缴税款：{{tds}}',
      ytdEarnings: '本年度累计收入：{{earnings}}。',
      viewTaxDetails: '查看税务明细 →',
      summaryTitle: '年度累计汇总',
      totalEarnings: '总收入',
      salaryPaid: '已发基本工资',
      totalCommission: '总提成',
      conversions: '转化量',
      totalSessions: '总课时',
      avgPerSession: '平均课时费',
      activeClients: '活跃学员',
      documentsTitle: '税务文档',
      noDocumentsEmpty: '暂未出具任何税务文档。',
    },
  },
};

export default ledger;
