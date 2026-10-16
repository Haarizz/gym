import type { LocaleResource } from '../en';

const payments = {
  approval: {
    loading: 'Cargando el portal de socios...',
    approvedTitle: 'Pago aprobado',
    approved: 'Tu pago ha sido aprobado. Tu membresía ya está activa.',
    approvedForPlan: 'Tu pago de {{plan}} ha sido aprobado. Tu membresía ya está activa.',
    rejectedTitle: 'Pago rechazado',
    rejected: 'Tu pago ha sido rechazado.',
    rejectedForPlan: 'Tu pago de {{plan}} ha sido rechazado.',
    rejectedReason: 'Motivo: {{reason}}',

    pendingTitle: 'Pago pendiente de aprobación',
    pendingAtGym: 'Tu pago en {{gym}} se ha enviado y está a la espera de que el personal confirme que lo ha recibido.',
    pending: 'Tu pago se ha enviado y está a la espera de que el personal confirme que lo ha recibido.',
    pendingInfo:
      'Muestra la confirmación de pago en recepción si aún no lo has hecho. Tu acceso a la app se desbloqueará automáticamente cuando lo aprueben — desliza hacia abajo para comprobarlo.',

    rejectedScreenTitle: 'Pago rechazado',
    rejectedAtGymForPlan:
      'El personal de {{gym}} no aprobó tu pago de {{plan}}, así que tu membresía no se ha activado.',
    rejectedAtGym: 'El personal de {{gym}} no aprobó tu pago, así que tu membresía no se ha activado.',
    rejectedPlanOnly: 'El personal del gimnasio no aprobó tu pago de {{plan}}, así que tu membresía no se ha activado.',
    rejectedGeneric: 'El personal del gimnasio no aprobó tu pago, así que tu membresía no se ha activado.',
    reason: 'Motivo',
    noReason: 'No se indicó ningún motivo. Contacta con el gimnasio para más detalles.',
    rejectedInfo: 'Contacta con la recepción del gimnasio para resolver el pago, o vuelve a comprar un plan.',
    browseGyms: 'Explorar gimnasios',
  },

  outstanding: {
    subscription: 'Suscripción',
    membership: 'Membresía',
    statusValues: {
      PAID: 'Pagado',
      PARTIALLY_PAID: 'Pago parcial',
      UNPAID: 'Sin pagar',
    },
    membershipAmount: 'Importe de la membresía',
    paid: 'Pagado',
    remainingBalance: 'Saldo pendiente',
    completePayment: 'Completar pago',
    blockedApprovalPending: 'El pago de tu membresía está pendiente de aprobación del gimnasio.',
    blockedNoBills: 'Este saldo no se puede pagar en la app. Paga en recepción.',
    cantPayInApp: 'Este saldo no se puede pagar en la app.',

    nothingToPayNow: 'No hay nada que pagar ahora mismo.',
    methodNotAllowed: '{{method}} no se puede usar en la app. Elige {{allowed}}, o paga en recepción.',
    splitNotAllowed: 'Los pagos divididos deben hacerse en recepción.',
    payFull: 'Paga el saldo pendiente completo de {{amount}}.',
    conflict: 'Tu saldo ha cambiado. Revísalo e inténtalo de nuevo.',
    rejected: 'No se pudo completar el pago.',
    network:
      'No pudimos confirmar tu pago porque se perdió la conexión. Puedes reintentarlo con seguridad — no se te cobrará dos veces.',

    screenTitle: 'Pago de membresía',
    screenSubtitle: 'Saldo pendiente',
    notAcceptedTitle: 'Pago no aceptado',
    notAvailableTitle: 'Pago no disponible',
    notAvailable: 'Este pago no está vinculado a tu membresía. Puede pertenecer a otro gimnasio o cuenta.',
    goToMembership: 'Ir a la membresía',
    loadErrorTitle: 'No se pudo cargar tu saldo',
    loadError: 'Comprueba tu conexión e inténtalo de nuevo.',
    retry: 'Reintentar',
    recordedTitle: 'Pago registrado',
    appliedWithReceipt: 'Se aplicaron {{amount}} a tu membresía (recibo {{receipt}}).',
    applied: 'Se aplicaron {{amount}} a tu membresía.',
    remainingAfter: 'Saldo pendiente: {{amount}}.',
    fullyPaid: 'Tu membresía está totalmente pagada.',
    backToMembership: 'Volver a la membresía',
    nothingToPayTitle: 'Nada que pagar',
    unpaidBills: 'Facturas pendientes',
    billFallback: 'Factura {{id}}',
    retryPayment: 'Reintentar pago',
    pay: 'Pagar <amount/>',
    sheetSubtitle: 'Paga tu saldo pendiente de {{amount}}',
  },
} satisfies LocaleResource;

export default payments;
