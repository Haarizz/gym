const ledger = {
  ledger: {
    loading: 'खाता बही लोड हो रहा है...',
    errorTitle: 'आपका खाता बही लोड नहीं हो सका',
    errorNetwork: 'अपना कनेक्शन जांचें और पुन: प्रयास करें।',
    errorEmpty: 'अभी तक कोई खाता डेटा उपलब्ध नहीं है।',
    retry: 'पुन: प्रयास करें',

    tabs: {
      breakdown: 'विवरण',
      earnings: 'कमाई',
      transactions: 'लेन-देन',
      tax: 'कर जानकारी',
    },

    summary: {
      title: 'कमाई सारांश',
      thisMonth: 'इस महीने',
      lastMonth: 'पिछले महीने',
      baseSalary: 'मूल वेतन',
      commission: 'कमीशन',
      paid: 'भुगतान किया गया',
      pending: 'लंबित',
    },

    stats: {
      growth: 'वृद्धि',
      noEarningsLastMonth: 'पिछले महीने कोई कमाई नहीं',
      vsLastMonth: 'पिछले महीने की तुलना में',
      nextPayout: 'अगला भुगतान',
    },

    breakdown: {
      title: 'कमाई विवरण',
      commissionStructureTitle: 'कमीशन संरचना',
      monthlyComparisonTitle: 'मासिक तुलना',
    },

    earnings: {
      recentEarningsTitle: 'हाल की कमाई',
      recentTransactionsTitle: 'हाल के लेन-देन',
      viewAll: 'सभी देखें',
      noEarningsEmpty: 'अभी कोई कमाई नहीं। वेतन भुगतान और आपकी बिक्री से कमीशन यहां दिखाई देगा।',
      noTransactionsEmpty: 'अभी कोई लेन-देन नहीं। वेतन भुगतान और आपकी बिक्री से कमीशन यहां दिखाई देगा।',
      statusPaid: 'भुगतान किया गया',
      statusPending: 'लंबित',
      downloadSalarySlip: 'वेतन पर्ची डाउनलोड करें',
      downloadReport: 'रिपोर्ट डाउनलोड करें',
      viewDetails: 'विवरण देखें',
      salarySlipSuccessTitle: 'वेतन पर्ची तैयार',
      salarySlipSuccessDesc: 'आपकी वेतन पर्ची सफलतापूर्वक तैयार कर ली गई है।',
      salarySlipNoticeTitle: 'डाउनलोड सूचना',
      salarySlipNoticeDesc: 'आपकी वेतन पर्ची मानव संसाधन द्वारा तैयार की जा रही है।',
      taxDocSuccessTitle: 'कर दस्तावेज़ तैयार',
      taxDocSuccessDesc: '{{title}} देखने के लिए तैयार है।',
      taxDocNoticeTitle: 'दस्तावेज़ सूचना',
      taxDocNoticeDesc: 'अनुपालन टीम द्वारा दाखिल किए जाने पर {{title}} प्रदान किया जाएगा।',
      downloadA11y: '{{title}} डाउनलोड करें',
    },

    tax: {
      title: 'कर जानकारी',
      ytdEarningsWithTds: 'आपकी वर्ष-दर-वर्ष कमाई: {{earnings}}। टीडीएस कटौती: {{tds}}',
      ytdEarnings: 'आपकी वर्ष-दर-वर्ष कमाई: {{earnings}}।',
      viewTaxDetails: 'कर विवरण देखें →',
      summaryTitle: 'वर्ष-दर-वर्ष सारांश',
      totalEarnings: 'कुल कमाई',
      salaryPaid: 'वेतन भुगतान',
      totalCommission: 'कुल कमीशन',
      conversions: 'रूपांतरण',
      totalSessions: 'कुल सत्र',
      avgPerSession: 'प्रति सत्र औसत',
      activeClients: 'सक्रिय क्लाइंट्स',
      documentsTitle: 'कर दस्तावेज़',
      noDocumentsEmpty: 'अभी तक कोई कर दस्तावेज़ जारी नहीं किया गया है।',
    },
  },
};

export default ledger;
