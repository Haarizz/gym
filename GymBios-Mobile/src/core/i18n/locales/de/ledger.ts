const ledger = {
  ledger: {
    loading: 'Kassenbuch wird geladen...',
    errorTitle: 'Dein Kassenbuch konnte nicht geladen werden',
    errorNetwork: 'Überprüfe deine Internetverbindung und versuche es erneut.',
    errorEmpty: 'Noch keine Kassenbuchdaten verfügbar.',
    retry: 'Erneut versuchen',

    tabs: {
      breakdown: 'Aufschlüsselung',
      earnings: 'Einnahmen',
      transactions: 'Transaktionen',
      tax: 'Steuerinfo',
    },

    summary: {
      title: 'Verdienstübersicht',
      thisMonth: 'Diesen Monat',
      lastMonth: 'Letzten Monat',
      baseSalary: 'Grundgehalt',
      commission: 'Provision',
      paid: 'Bezahlt',
      pending: 'Ausstehend',
    },

    stats: {
      growth: 'Wachstum',
      noEarningsLastMonth: 'Keine Einnahmen im Vormonat',
      vsLastMonth: 'ggü. Vormonat',
      nextPayout: 'Nächste Auszahlung',
    },

    breakdown: {
      title: 'Einnahmenaufschlüsselung',
      commissionStructureTitle: 'Provisionsstruktur',
      monthlyComparisonTitle: 'Monatsvergleich',
    },

    earnings: {
      recentEarningsTitle: 'Letzte Einnahmen',
      recentTransactionsTitle: 'Letzte Transaktionen',
      viewAll: 'Alle anzeigen',
      noEarningsEmpty: 'Noch keine Einnahmen. Gehaltszahlungen und Verkaufsprovisionen erscheinen hier.',
      noTransactionsEmpty: 'Noch keine Transaktionen. Gehaltszahlungen und Verkaufsprovisionen erscheinen hier.',
      statusPaid: 'BEZAHLT',
      statusPending: 'AUSSTEHEND',
      downloadSalarySlip: 'Gehaltsabrechnung herunterladen',
      downloadReport: 'Bericht herunterladen',
      viewDetails: 'Details anzeigen',
      salarySlipSuccessTitle: 'Gehaltsabrechnung bereit',
      salarySlipSuccessDesc: 'Deine Gehaltsabrechnung wurde erfolgreich erstellt.',
      salarySlipNoticeTitle: 'Download-Hinweis',
      salarySlipNoticeDesc: 'Deine Gehaltsabrechnung wird derzeit von der Personalabteilung vorbereitet.',
      taxDocSuccessTitle: 'Steuerdokument bereit',
      taxDocSuccessDesc: '{{title}} kann jetzt angezeigt werden.',
      taxDocNoticeTitle: 'Dokumentenhinweis',
      taxDocNoticeDesc: '{{title}} wird bereitgestellt, sobald es eingereicht wurde.',
      downloadA11y: '{{title}} herunterladen',
    },

    tax: {
      title: 'Steuerinformationen',
      ytdEarningsWithTds: 'Jahreseinnahmen: {{earnings}}. Einbehaltene Steuern: {{tds}}',
      ytdEarnings: 'Jahreseinnahmen: {{earnings}}.',
      viewTaxDetails: 'Steuerdetails anzeigen →',
      summaryTitle: 'Jahresübersicht',
      totalEarnings: 'Gesamteinnahmen',
      salaryPaid: 'Gezahltes Gehalt',
      totalCommission: 'Gesamtprovision',
      conversions: 'Konvertierungen',
      totalSessions: 'Sitzungen gesamt',
      avgPerSession: 'Durchschn. pro Sitzung',
      activeClients: 'Aktive Kunden',
      documentsTitle: 'Steuerdokumente',
      noDocumentsEmpty: 'Bisher wurden keine Steuerdokumente ausgestellt.',
    },
  },
};

export default ledger;
