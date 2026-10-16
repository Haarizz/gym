const ledger = {
  ledger: {
    loading: 'Chargement du registre...',
    errorTitle: 'Impossible de charger votre registre',
    errorNetwork: 'Vérifiez votre connexion et réessayez.',
    errorEmpty: 'Aucune donnée de registre disponible pour le moment.',
    retry: 'Réessayer',

    tabs: {
      breakdown: 'Détail',
      earnings: 'Gains',
      transactions: 'Transactions',
      tax: 'Infos fiscales',
    },

    summary: {
      title: 'Résumé des gains',
      thisMonth: 'Ce mois-ci',
      lastMonth: 'Le mois dernier',
      baseSalary: 'Salaire de base',
      commission: 'Commission',
      paid: 'Payé',
      pending: 'En attente',
    },

    stats: {
      growth: 'Croissance',
      noEarningsLastMonth: 'Aucun gain le mois dernier',
      vsLastMonth: 'par rapport au mois dernier',
      nextPayout: 'Prochain versement',
    },

    breakdown: {
      title: 'Détail des gains',
      commissionStructureTitle: 'Structure des commissions',
      monthlyComparisonTitle: 'Comparaison mensuelle',
    },

    earnings: {
      recentEarningsTitle: 'Gains récents',
      recentTransactionsTitle: 'Transactions récentes',
      viewAll: 'Voir tout',
      noEarningsEmpty: 'Aucun gain pour le moment. Les paiements de salaires et commissions apparaîtront ici.',
      noTransactionsEmpty: 'Aucune transaction pour le moment. Les paiements de salaires et commissions apparaîtront ici.',
      statusPaid: 'PAYÉ',
      statusPending: 'EN ATTENTE',
      downloadSalarySlip: 'Télécharger le bulletin de salaire',
      downloadReport: 'Télécharger le rapport',
      viewDetails: 'Voir les détails',
      salarySlipSuccessTitle: 'Bulletin de salaire prêt',
      salarySlipSuccessDesc: 'Votre bulletin de salaire a été généré avec succès.',
      salarySlipNoticeTitle: 'Avis de téléchargement',
      salarySlipNoticeDesc: 'Votre bulletin de salaire est en cours de préparation par les RH.',
      taxDocSuccessTitle: 'Document fiscal prêt',
      taxDocSuccessDesc: '{{title}} est prêt à être consulté.',
      taxDocNoticeTitle: 'Avis relatif au document',
      taxDocNoticeDesc: '{{title}} sera fourni une fois déposé par l’équipe de conformité.',
      downloadA11y: 'Télécharger {{title}}',
    },

    tax: {
      title: 'Informations fiscales',
      ytdEarningsWithTds: 'Gains cumulés de l’année : {{earnings}}. Retenue à la source : {{tds}}',
      ytdEarnings: 'Gains cumulés de l’année : {{earnings}}.',
      viewTaxDetails: 'Voir les détails fiscaux →',
      summaryTitle: 'Résumé annuel cumulé',
      totalEarnings: 'Gains totaux',
      salaryPaid: 'Salaire payé',
      totalCommission: 'Commission totale',
      conversions: 'Conversions',
      totalSessions: 'Séances totales',
      avgPerSession: 'Moyenne par séance',
      activeClients: 'Clients actifs',
      documentsTitle: 'Documents fiscaux',
      noDocumentsEmpty: 'Aucun document fiscal n’a été émis pour le moment.',
    },
  },
};

export default ledger;
