import type { LocaleResource } from '../en';

const paymentSheet = {
  paymentSheet: {
    title: "Paiement",
    processingFor: "Paiement pour {{title}}",
    amountDue: "Montant dû",
    howToPay: "Comment souhaitez-vous payer ?",
    howToPayStaff: "Comment le membre paie-t-il ?",
    allMethods: "Tous les moyens de paiement",

    methods: {
      card: { title: "Carte", subtitle: "Carte, Apple Pay, Google Pay" },
      upi: { title: "UPI", subtitle: "Toute appli UPI" },
      netbanking: { title: "Banque en ligne", subtitle: "Payez depuis votre banque" },
      cash: { title: "Espèces", subtitleMember: "Payer à l’accueil", subtitleStaff: "Encaisser en personne" },
      credit: { title: "Payer plus tard", subtitle: "Une partie maintenant, le reste sur compte" },
      mixed: { title: "Espèces + en ligne", subtitle: "Fractionner le paiement" },
    },

    unavailable: {
      online: "Pas encore disponible",
      inrOnly: "Uniquement pour les paiements en INR",
      nothingToPay: "Rien à payer en ligne",
    },

    online: {
      title: {
        card: "Payer par carte",
        upi: "Payer par UPI",
        netbanking: "Payer par banque en ligne",
      },
      note: {
        card: "Payez <amount/> par carte, Apple Pay ou Google Pay dans le paiement sécurisé.",
        upi: "Validez <amount/> dans votre appli UPI, puis revenez ici.",
        netbanking: "Choisissez votre banque, validez <amount/>, puis revenez ici.",
      },
      secure: "Les paiements sont traités en toute sécurité par Stripe. Les données de carte ne parviennent jamais à la salle.",
    },

    cash: {
      memberTitle: "Payer à l’accueil",
      memberNote: "Nous envoyons une demande de paiement à l’accueil. Payez <amount/> en espèces à l’accueil — c’est confirmé dès que l’équipe l’a reçu.",
      sendRequest: "Envoyer la demande",
      staffTitle: "Encaisser en espèces",
      staffNote: "Encaissez <amount/> en espèces auprès du membre, puis confirmez.",
      received: "Espèces reçues",
    },

    credit: {
      memberNote: "Payez une partie maintenant si vous le souhaitez — le reste est porté sur votre compte après validation par l’accueil.",
      staffNote: "Encaissez une partie maintenant si le membre le souhaite — le reste s’ajoute à son solde dû.",
      payNow: "Payer maintenant",
      nothingNow: "Rien",
      onAccount: "Sur le compte",
      payNowWith: "Payer maintenant par",
      dueDate: "Date d’échéance (facultatif)",
      selectDueDate: "Choisir une date d’échéance",
      request: "Demander un crédit",
      addToAccount: "Ajouter au compte",
    },

    mixed: {
      memberNote: "Payez la partie en espèces à l’accueil ; le reste est débité en ligne maintenant.",
      staffNote: "Encaissez d’abord la partie en espèces ; le reste est débité en ligne.",
      cashPart: "Partie en espèces",
      cash: "Espèces",
      payOnlineWith: "Payer le reste par",
    },

    split: {
      exactAmount: "Montant exact (<currency/>)",
      ofTotal: "sur <amount/>",
    },

    cta: {
      pay: "Payer <amount/>",
      payNow: "Payer <amount/> maintenant",
      payOnline: "Payer <amount/> en ligne",
    },

    simulated: {
      badge: "MODE TEST",
      title: "Paiement test",
      note: "Simulation — aucun argent n’est débité. Validez pour continuer comme si <amount/> avaient été payés par {{method}}.",
      approve: "Valider le paiement test",
      decline: "Refuser",
    },

    processing: {
      opening: "Ouverture du paiement sécurisé…",
      finishing: "Finalisation…",
      keepOpen: "Veuillez garder cet écran ouvert",
    },

    discount: {
      title: 'Choisir une remise (facultatif)',
      type: 'Type de remise',
      none: 'Aucune remise',
      fixed: 'Montant fixe',
      percentage: 'Pourcentage (%)',
      percentLabel: 'Remise (%)',
      amountLabel: 'Montant (<currency/>)',
    },

    form: {
      example: 'ex. {{value}}',
    },

    errors: {
      failed: "Le paiement n’a pas abouti",
      refunded: "Cela n’a pas abouti. Si vous avez été débité, vous serez remboursé automatiquement.",
      noGym: "Aucune salle n’est sélectionnée pour ce paiement",
      needBoth: "Choisissez un montant pour la partie espèces et la partie en ligne",
      amountTooHigh: "Ne peut pas dépasser le montant dû",
    },
  },
} satisfies LocaleResource;

export default paymentSheet;
