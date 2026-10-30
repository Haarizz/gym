import type { LocaleResource } from '../en';

const payments = {
  approval: {
    loading: 'Mitgliederportal wird geladen...',
    approvedTitle: 'Zahlung freigegeben',
    approved: 'Deine Zahlung wurde freigegeben. Deine Mitgliedschaft ist jetzt aktiv.',
    approvedForPlan: 'Deine Zahlung für {{plan}} wurde freigegeben. Deine Mitgliedschaft ist jetzt aktiv.',
    rejectedTitle: 'Zahlung abgelehnt',
    rejected: 'Deine Zahlung wurde abgelehnt.',
    rejectedForPlan: 'Deine Zahlung für {{plan}} wurde abgelehnt.',
    rejectedReason: 'Grund: {{reason}}',

    pendingTitle: 'Zahlung wartet auf Freigabe',
    pendingAtGym: 'Deine Zahlung bei {{gym}} wurde übermittelt und wartet darauf, dass das Studio den Eingang bestätigt.',
    pending: 'Deine Zahlung wurde übermittelt und wartet darauf, dass das Studio den Eingang bestätigt.',
    pendingInfo:
      'Zeige deine Zahlungsbestätigung am Empfang, falls noch nicht geschehen. Dein App-Zugang wird nach der Freigabe automatisch freigeschaltet — zum erneuten Prüfen nach unten ziehen.',

    rejectedScreenTitle: 'Zahlung abgelehnt',
    rejectedAtGymForPlan:
      'Deine Zahlung bei {{gym}} für {{plan}} wurde vom Studio nicht freigegeben, daher wurde deine Mitgliedschaft nicht aktiviert.',
    rejectedAtGym: 'Deine Zahlung bei {{gym}} wurde vom Studio nicht freigegeben, daher wurde deine Mitgliedschaft nicht aktiviert.',
    rejectedPlanOnly: 'Deine Zahlung für {{plan}} wurde vom Studio nicht freigegeben, daher wurde deine Mitgliedschaft nicht aktiviert.',
    rejectedGeneric: 'Deine Zahlung wurde vom Studio nicht freigegeben, daher wurde deine Mitgliedschaft nicht aktiviert.',
    reason: 'Grund',
    noReason: 'Es wurde kein Grund angegeben. Bitte wende dich für Details an das Studio.',
    rejectedInfo: 'Bitte kläre die Zahlung am Empfang deines Studios oder kaufe erneut einen Tarif.',
    browseGyms: 'Studios durchsuchen',

    suspendedTitle: "Mitgliedschaft ausgesetzt",
    suspendedAtGym: "Deine Mitgliedschaft bei {{gym}} wurde vom Studio ausgesetzt.",
    suspendedGeneric: "Deine Mitgliedschaft wurde vom Studio ausgesetzt.",
    suspendedInfo: "Dein GymBios-Konto funktioniert weiterhin: Du kannst die Community durchsuchen und Studios finden. Wende dich an den Empfang des Studios, um deine Mitgliedschaft wiederherzustellen, und ziehe dann nach unten, um erneut zu prüfen.",
    openCommunity: "Community öffnen",
  },

  outstanding: {
    subscription: 'Abo',
    membership: 'Mitgliedschaft',
    statusValues: {
      PAID: 'Bezahlt',
      PARTIALLY_PAID: 'Teilweise bezahlt',
      UNPAID: 'Unbezahlt',
    },
    membershipAmount: 'Mitgliedsbetrag',
    paid: 'Bezahlt',
    remainingBalance: 'Offener Betrag',
    completePayment: 'Zahlung abschließen',
    blockedApprovalPending: 'Deine Mitgliedszahlung wartet auf Freigabe durch das Studio.',
    blockedNoBills: 'Dieser Betrag kann nicht in der App bezahlt werden. Bitte bezahle am Empfang.',
    cantPayInApp: 'Dieser Betrag kann nicht in der App bezahlt werden.',

    nothingToPayNow: 'Derzeit ist nichts zu bezahlen.',
    methodNotAllowed: '{{method}} kann in der App nicht verwendet werden. Wähle {{allowed}} oder bezahle am Empfang.',
    splitNotAllowed: 'Geteilte Zahlungen müssen am Empfang erfolgen.',
    payFull: 'Bitte bezahle den gesamten offenen Betrag von {{amount}}.',
    conflict: 'Dein Saldo hat sich geändert. Bitte prüfe ihn und versuche es erneut.',
    rejected: 'Die Zahlung konnte nicht abgeschlossen werden.',
    network:
      'Wir konnten deine Zahlung wegen einer Verbindungsunterbrechung nicht bestätigen. Ein erneuter Versuch ist sicher — es wird nicht doppelt abgebucht.',

    screenTitle: 'Mitgliedszahlung',
    screenSubtitle: 'Offener Betrag',
    notAcceptedTitle: 'Zahlung nicht akzeptiert',
    notAvailableTitle: 'Zahlung nicht verfügbar',
    notAvailable: 'Diese Zahlung ist nicht mit deiner Mitgliedschaft verknüpft. Sie gehört eventuell zu einem anderen Studio oder Konto.',
    goToMembership: 'Zur Mitgliedschaft',
    loadErrorTitle: 'Saldo konnte nicht geladen werden',
    loadError: 'Prüfe deine Verbindung und versuche es erneut.',
    retry: 'Erneut versuchen',
    recordedTitle: 'Zahlung erfasst',
    appliedWithReceipt: '{{amount}} wurde deiner Mitgliedschaft gutgeschrieben (Beleg {{receipt}}).',
    applied: '{{amount}} wurde deiner Mitgliedschaft gutgeschrieben.',
    remainingAfter: 'Offener Betrag: {{amount}}.',
    fullyPaid: 'Deine Mitgliedschaft ist vollständig bezahlt.',
    backToMembership: 'Zurück zur Mitgliedschaft',
    nothingToPayTitle: 'Nichts zu bezahlen',
    unpaidBills: 'Offene Rechnungen',
    billFallback: 'Rechnung {{id}}',
    retryPayment: 'Zahlung erneut versuchen',
    pay: '<amount/> bezahlen',
    sheetSubtitle: 'Bezahle deinen offenen Betrag von {{amount}}',
  },
} satisfies LocaleResource;

export default payments;
