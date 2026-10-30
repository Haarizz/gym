import type { LocaleResource } from '../en';

const paymentSheet = {
  paymentSheet: {
    title: "Pago",
    processingFor: "Pago de {{title}}",
    amountDue: "Importe a pagar",
    howToPay: "¿Cómo quieres pagar?",
    howToPayStaff: "¿Cómo paga el socio?",
    allMethods: "Todos los métodos de pago",

    methods: {
      card: { title: "Tarjeta", subtitle: "Tarjeta, Apple Pay, Google Pay" },
      upi: { title: "UPI", subtitle: "Cualquier app UPI" },
      netbanking: { title: "Banca online", subtitle: "Paga desde tu banco" },
      cash: { title: "Efectivo", subtitleMember: "Paga en recepción", subtitleStaff: "Cobrar en persona" },
      credit: { title: "Pagar después", subtitle: "Parte ahora, el resto a cuenta" },
      mixed: { title: "Efectivo + online", subtitle: "Divide el pago" },
    },

    unavailable: {
      online: "Aún no disponible",
      inrOnly: "Solo para pagos en INR",
      nothingToPay: "Nada que pagar online",
    },

    online: {
      title: {
        card: "Pagar con tarjeta",
        upi: "Pagar con UPI",
        netbanking: "Pagar con banca online",
      },
      note: {
        card: "Paga <amount/> con tarjeta, Apple Pay o Google Pay en el pago seguro.",
        upi: "Aprueba <amount/> en tu app UPI y vuelve aquí.",
        netbanking: "Elige tu banco, aprueba <amount/> y vuelve aquí.",
      },
      secure: "Los pagos los procesa Stripe de forma segura. Los datos de la tarjeta nunca llegan al gimnasio.",
    },

    cash: {
      memberTitle: "Paga en recepción",
      memberNote: "Enviaremos una solicitud de pago a recepción. Paga <amount/> en efectivo en recepción; se confirma cuando el personal lo recibe.",
      sendRequest: "Enviar solicitud",
      staffTitle: "Cobrar en efectivo",
      staffNote: "Cobra <amount/> en efectivo al socio y confirma.",
      received: "Efectivo recibido",
    },

    credit: {
      memberNote: "Paga una parte ahora si quieres; el resto se carga a tu cuenta cuando recepción lo apruebe.",
      staffNote: "Cobra una parte ahora si el socio quiere; el resto se suma a su saldo pendiente.",
      payNow: "Pagar ahora",
      nothingNow: "Nada",
      onAccount: "A cuenta",
      payNowWith: "Pagar ahora con",
      dueDate: "Fecha de vencimiento (opcional)",
      selectDueDate: "Elige la fecha de vencimiento",
      request: "Solicitar crédito",
      addToAccount: "Añadir a la cuenta",
    },

    mixed: {
      memberNote: "Paga la parte en efectivo en recepción; el resto se cobra online ahora.",
      staffNote: "Cobra primero la parte en efectivo; el resto se cobra online.",
      cashPart: "Parte en efectivo",
      cash: "Efectivo",
      payOnlineWith: "Paga el resto con",
    },

    split: {
      exactAmount: "Importe exacto (<currency/>)",
      ofTotal: "de <amount/>",
    },

    cta: {
      pay: "Pagar <amount/>",
      payNow: "Pagar <amount/> ahora",
      payOnline: "Pagar <amount/> online",
    },

    simulated: {
      badge: "MODO DE PRUEBA",
      title: "Pago de prueba",
      note: "Simulación: no se mueve dinero. Aprueba para continuar como si se hubieran pagado <amount/> con {{method}}.",
      approve: "Aprobar pago de prueba",
      decline: "Rechazar",
    },

    processing: {
      opening: "Abriendo el pago seguro…",
      finishing: "Terminando…",
      keepOpen: "Mantén esta pantalla abierta",
    },

    discount: {
      title: 'Elige un descuento (opcional)',
      type: 'Tipo de descuento',
      none: 'Sin descuento',
      fixed: 'Importe fijo',
      percentage: 'Porcentaje (%)',
      percentLabel: 'Descuento (%)',
      amountLabel: 'Importe (<currency/>)',
    },

    form: {
      example: 'p. ej. {{value}}',
    },

    errors: {
      failed: "El pago no se completó",
      refunded: "No se completó. Si se te cobró, el dinero se reembolsa automáticamente.",
      noGym: "No hay gimnasio seleccionado para este pago",
      needBoth: "Elige un importe para la parte en efectivo y la online",
      amountTooHigh: "No puede superar el importe a pagar",
    },
  },
} satisfies LocaleResource;

export default paymentSheet;
