const ledger = {
  ledger: {
    loading: 'Cargando libro mayor...',
    errorTitle: 'No se pudo cargar tu libro mayor',
    errorNetwork: 'Comprueba tu conexión e inténtalo de nuevo.',
    errorEmpty: 'Aún no hay datos disponibles en el libro mayor.',
    retry: 'Reintentar',

    tabs: {
      breakdown: 'Desglose',
      earnings: 'Ganancias',
      transactions: 'Transacciones',
      tax: 'Info fiscal',
    },

    summary: {
      title: 'Resumen de ganancias',
      thisMonth: 'Este mes',
      lastMonth: 'El mes pasado',
      baseSalary: 'Salario base',
      commission: 'Comisión',
      paid: 'Pagado',
      pending: 'Pendiente',
    },

    stats: {
      growth: 'Crecimiento',
      noEarningsLastMonth: 'Sin ganancias el mes pasado',
      vsLastMonth: 'vs el mes pasado',
      nextPayout: 'Próximo pago',
    },

    breakdown: {
      title: 'Desglose de ganancias',
      commissionStructureTitle: 'Estructura de comisiones',
      monthlyComparisonTitle: 'Comparación mensual',
    },

    earnings: {
      recentEarningsTitle: 'Ganancias recientes',
      recentTransactionsTitle: 'Transacciones recientes',
      viewAll: 'Ver todo',
      noEarningsEmpty: 'Aún no hay ganancias. Los pagos de nómina y comisiones por tus ventas aparecerán aquí.',
      noTransactionsEmpty: 'Aún no hay transacciones. Los pagos de nómina y comisiones por tus ventas aparecerán aquí.',
      statusPaid: 'PAGADO',
      statusPending: 'PENDIENTE',
      downloadSalarySlip: 'Descargar nómina',
      downloadReport: 'Descargar informe',
      viewDetails: 'Ver detalles',
      salarySlipSuccessTitle: 'Nómina lista',
      salarySlipSuccessDesc: 'Tu comprobante de nómina se ha generado con éxito.',
      salarySlipNoticeTitle: 'Aviso de descarga',
      salarySlipNoticeDesc: 'Tu comprobante de nómina está siendo preparado por RR. HH.',
      taxDocSuccessTitle: 'Documento fiscal listo',
      taxDocSuccessDesc: '{{title}} está listo para su visualización.',
      taxDocNoticeTitle: 'Aviso de documento',
      taxDocNoticeDesc: '{{title}} se proporcionará una vez tramitado por el equipo de cumplimiento.',
      downloadA11y: 'Descargar {{title}}',
    },

    tax: {
      title: 'Información fiscal',
      ytdEarningsWithTds: 'Tus ganancias anuales acumuladas: {{earnings}}. Retención aplicada: {{tds}}',
      ytdEarnings: 'Tus ganancias anuales acumuladas: {{earnings}}.',
      viewTaxDetails: 'Ver detalles fiscales →',
      summaryTitle: 'Resumen anual acumulado',
      totalEarnings: 'Ganancias totales',
      salaryPaid: 'Salario pagado',
      totalCommission: 'Comisión total',
      conversions: 'Conversiones',
      totalSessions: 'Sesiones totales',
      avgPerSession: 'Promedio por sesión',
      activeClients: 'Clientes activos',
      documentsTitle: 'Documentos fiscales',
      noDocumentsEmpty: 'Aún no se han emitido documentos fiscales.',
    },
  },
};

export default ledger;
