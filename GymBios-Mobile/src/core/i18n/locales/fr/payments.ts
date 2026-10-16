import type { LocaleResource } from '../en';

const payments = {
  approval: {
    loading: 'Chargement de l’espace membre...',
    approvedTitle: 'Paiement validé',
    approved: 'Votre paiement a été validé. Votre adhésion est maintenant active.',
    approvedForPlan: 'Votre paiement pour {{plan}} a été validé. Votre adhésion est maintenant active.',
    rejectedTitle: 'Paiement refusé',
    rejected: 'Votre paiement a été refusé.',
    rejectedForPlan: 'Votre paiement pour {{plan}} a été refusé.',
    rejectedReason: 'Motif : {{reason}}',

    pendingTitle: 'Paiement en attente de validation',
    pendingAtGym: 'Votre paiement chez {{gym}} a été envoyé et attend que le personnel confirme sa réception.',
    pending: 'Votre paiement a été envoyé et attend que le personnel confirme sa réception.',
    pendingInfo:
      'Présentez votre confirmation de paiement à l’accueil si ce n’est pas déjà fait. Votre accès à l’application sera débloqué automatiquement après validation — tirez vers le bas pour vérifier.',

    rejectedScreenTitle: 'Paiement refusé',
    rejectedAtGymForPlan:
      'Votre paiement chez {{gym}} pour {{plan}} n’a pas été validé par le personnel, votre adhésion n’a donc pas été activée.',
    rejectedAtGym: 'Votre paiement chez {{gym}} n’a pas été validé par le personnel, votre adhésion n’a donc pas été activée.',
    rejectedPlanOnly: 'Votre paiement pour {{plan}} n’a pas été validé par le personnel, votre adhésion n’a donc pas été activée.',
    rejectedGeneric: 'Votre paiement n’a pas été validé par le personnel, votre adhésion n’a donc pas été activée.',
    reason: 'Motif',
    noReason: 'Aucun motif n’a été indiqué. Veuillez contacter la salle pour plus de détails.',
    rejectedInfo: 'Veuillez contacter l’accueil de la salle pour régulariser le paiement, ou acheter à nouveau une formule.',
    browseGyms: 'Parcourir les salles',
  },

  outstanding: {
    subscription: 'Abonnement',
    membership: 'Adhésion',
    statusValues: {
      PAID: 'Payé',
      PARTIALLY_PAID: 'Partiellement payé',
      UNPAID: 'Impayé',
    },
    membershipAmount: 'Montant de l’adhésion',
    paid: 'Payé',
    remainingBalance: 'Solde restant',
    completePayment: 'Finaliser le paiement',
    blockedApprovalPending: 'Le paiement de votre adhésion attend la validation de la salle.',
    blockedNoBills: 'Ce solde ne peut pas être réglé dans l’application. Veuillez payer à l’accueil.',
    cantPayInApp: 'Ce solde ne peut pas être réglé dans l’application.',

    nothingToPayNow: 'Rien à payer pour le moment.',
    methodNotAllowed: '{{method}} n’est pas utilisable dans l’application. Choisissez {{allowed}}, ou payez à l’accueil.',
    splitNotAllowed: 'Les paiements fractionnés doivent être effectués à l’accueil.',
    payFull: 'Veuillez régler la totalité du solde de {{amount}}.',
    conflict: 'Votre solde a changé. Veuillez vérifier et réessayer.',
    rejected: 'Le paiement n’a pas pu être effectué.',
    network:
      'Nous n’avons pas pu confirmer votre paiement suite à une perte de connexion. Vous pouvez réessayer sans risque — vous ne serez pas débité deux fois.',

    screenTitle: 'Paiement de l’adhésion',
    screenSubtitle: 'Solde dû',
    notAcceptedTitle: 'Paiement non accepté',
    notAvailableTitle: 'Paiement indisponible',
    notAvailable: 'Ce paiement n’est pas lié à votre adhésion. Il appartient peut-être à une autre salle ou à un autre compte.',
    goToMembership: 'Aller à l’adhésion',
    loadErrorTitle: 'Impossible de charger votre solde',
    loadError: 'Vérifiez votre connexion et réessayez.',
    retry: 'Réessayer',
    recordedTitle: 'Paiement enregistré',
    appliedWithReceipt: '{{amount}} a été imputé à votre adhésion (reçu {{receipt}}).',
    applied: '{{amount}} a été imputé à votre adhésion.',
    remainingAfter: 'Solde restant : {{amount}}.',
    fullyPaid: 'Votre adhésion est entièrement payée.',
    backToMembership: 'Retour à l’adhésion',
    nothingToPayTitle: 'Rien à payer',
    unpaidBills: 'Factures impayées',
    billFallback: 'Facture {{id}}',
    retryPayment: 'Réessayer le paiement',
    pay: 'Payer <amount/>',
    sheetSubtitle: 'Réglez votre solde restant de {{amount}}',
  },
} satisfies LocaleResource;

export default payments;
