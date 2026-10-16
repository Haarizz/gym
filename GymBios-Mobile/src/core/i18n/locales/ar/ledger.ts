const ledger = {
  ledger: {
    loading: 'جارٍ تحميل السجل...',
    errorTitle: 'تعذر تحميل سجلك',
    errorNetwork: 'تحقق من اتصالك وحاول مرة أخرى.',
    errorEmpty: 'لا توجد بيانات سجل متاحة حتى الآن.',
    retry: 'إعادة المحاولة',

    tabs: {
      breakdown: 'التفاصيل',
      earnings: 'الأرباح',
      transactions: 'المعاملات',
      tax: 'معلومات الضريبة',
    },

    summary: {
      title: 'ملخص الأرباح',
      thisMonth: 'هذا الشهر',
      lastMonth: 'الشهر الماضي',
      baseSalary: 'الراتب الأساسي',
      commission: 'العمولة',
      paid: 'مدفوع',
      pending: 'معلق',
    },

    stats: {
      growth: 'النمو',
      noEarningsLastMonth: 'لا توجد أرباح الشهر الماضي',
      vsLastMonth: 'مقارنة بالشهر الماضي',
      nextPayout: 'الدفعة التالية',
    },

    breakdown: {
      title: 'تفاصيل الأرباح',
      commissionStructureTitle: 'هيكل العمولات',
      monthlyComparisonTitle: 'المقارنة الشهرية',
    },

    earnings: {
      recentEarningsTitle: 'الأرباح الأخيرة',
      recentTransactionsTitle: 'المعاملات الأخيرة',
      viewAll: 'عرض الكل',
      noEarningsEmpty: 'لا توجد أرباح حتى الآن. ستظهر مدفوعات الراتب وعمولات مبيعاتك هنا.',
      noTransactionsEmpty: 'لا توجد معاملات حتى الآن. ستظهر مدفوعات الراتب وعمولات مبيعاتك هنا.',
      statusPaid: 'مدفوع',
      statusPending: 'معلق',
      downloadSalarySlip: 'تنزيل قسيمة الراتب',
      downloadReport: 'تنزيل التقرير',
      viewDetails: 'عرض التفاصيل',
      salarySlipSuccessTitle: 'قسيمة الراتب جاهزة',
      salarySlipSuccessDesc: 'تم إصدار إشعار قسيمة الراتب بنجاح.',
      salarySlipNoticeTitle: 'إشعار التنزيل',
      salarySlipNoticeDesc: 'يتم إعداد إشعار قسيمة الراتب بواسطة الموارد البشرية.',
      taxDocSuccessTitle: 'المستند الضريبي جاهز',
      taxDocSuccessDesc: '{{title}} جاهز للعرض.',
      taxDocNoticeTitle: 'إشعار المستند',
      taxDocNoticeDesc: 'سيتم تقديم {{title}} بمجرد تقديمه من فريق الامتثال.',
      downloadA11y: 'تنزيل {{title}}',
    },

    tax: {
      title: 'معلومات الضريبة',
      ytdEarningsWithTds: 'أرباحك منذ بداية العام: {{earnings}}. الضريبة المقتطعة: {{tds}}',
      ytdEarnings: 'أرباحك منذ بداية العام: {{earnings}}.',
      viewTaxDetails: 'عرض تفاصيل الضريبة ←',
      summaryTitle: 'ملخص منذ بداية العام',
      totalEarnings: 'إجمالي الأرباح',
      salaryPaid: 'الراتب المدفوع',
      totalCommission: 'إجمالي العمولة',
      conversions: 'التحويلات',
      totalSessions: 'إجمالي الجلسات',
      avgPerSession: 'متوسط كل جلسة',
      activeClients: 'العملاء النشطون',
      documentsTitle: 'المستندات الضريبية',
      noDocumentsEmpty: 'لم يتم إصدار أي مستندات ضريبية حتى الآن.',
    },
  },
};

export default ledger;
