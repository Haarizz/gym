import type { LocaleResource } from '../en';

const paymentSheet = {
  paymentSheet: {
    title: "Bezahlen",
    processingFor: "Zahlung für {{title}}",
    amountDue: "Fälliger Betrag",
    howToPay: "Wie möchtest du bezahlen?",
    howToPayStaff: "Wie zahlt das Mitglied?",
    allMethods: "Alle Zahlungsarten",

    methods: {
      card: { title: "Karte", subtitle: "Karte, Apple Pay, Google Pay" },
      upi: { title: "UPI", subtitle: "Jede UPI-App" },
      netbanking: { title: "Onlinebanking", subtitle: "Von deiner Bank zahlen" },
      cash: { title: "Bar", subtitleMember: "An der Rezeption zahlen", subtitleStaff: "Persönlich kassieren" },
      credit: { title: "Später zahlen", subtitle: "Teil jetzt, Rest aufs Konto" },
      mixed: { title: "Bar + online", subtitle: "Zahlung aufteilen" },
    },

    unavailable: {
      online: "Noch nicht verfügbar",
      inrOnly: "Nur für Zahlungen in INR",
      nothingToPay: "Nichts online zu zahlen",
    },

    online: {
      title: {
        card: "Mit Karte zahlen",
        upi: "Mit UPI zahlen",
        netbanking: "Per Onlinebanking zahlen",
      },
      note: {
        card: "Zahle <amount/> per Karte, Apple Pay oder Google Pay im sicheren Checkout.",
        upi: "Bestätige <amount/> in deiner UPI-App und kehre dann hierher zurück.",
        netbanking: "Wähle deine Bank, bestätige <amount/> und kehre dann hierher zurück.",
      },
      secure: "Zahlungen werden sicher von Stripe abgewickelt. Kartendaten erreichen das Studio nie.",
    },

    cash: {
      memberTitle: "An der Rezeption zahlen",
      memberNote: "Wir senden eine Zahlungsanfrage an die Rezeption. Zahle <amount/> bar an der Rezeption – bestätigt, sobald das Team das Geld erhalten hat.",
      sendRequest: "Anfrage senden",
      staffTitle: "Bargeld kassieren",
      staffNote: "Nimm <amount/> bar vom Mitglied entgegen und bestätige dann.",
      received: "Bargeld erhalten",
    },

    credit: {
      memberNote: "Zahle auf Wunsch einen Teil jetzt – der Rest wird nach Freigabe durch die Rezeption deinem Konto belastet.",
      staffNote: "Nimm auf Wunsch einen Teil jetzt an – der Rest wird dem offenen Saldo des Mitglieds hinzugefügt.",
      payNow: "Jetzt zahlen",
      nothingNow: "Nichts",
      onAccount: "Aufs Konto",
      payNowWith: "Jetzt zahlen mit",
      dueDate: "Fälligkeitsdatum (optional)",
      selectDueDate: "Fälligkeitsdatum wählen",
      request: "Zahlungsaufschub anfragen",
      addToAccount: "Aufs Konto buchen",
    },

    mixed: {
      memberNote: "Zahle den Baranteil an der Rezeption; der Rest wird jetzt online belastet.",
      staffNote: "Kassiere zuerst den Baranteil; der Rest wird online belastet.",
      cashPart: "Baranteil",
      cash: "Bar",
      payOnlineWith: "Rest zahlen mit",
    },

    split: {
      exactAmount: "Genauer Betrag (<currency/>)",
      ofTotal: "von <amount/>",
    },

    cta: {
      pay: "<amount/> zahlen",
      payNow: "<amount/> jetzt zahlen",
      payOnline: "<amount/> online zahlen",
    },

    simulated: {
      badge: "TESTMODUS",
      title: "Testzahlung",
      note: "Simulation – es fließt kein Geld. Bestätige, um so fortzufahren, als wären <amount/> per {{method}} bezahlt worden.",
      approve: "Testzahlung bestätigen",
      decline: "Ablehnen",
    },

    processing: {
      opening: "Sicherer Checkout wird geöffnet…",
      finishing: "Wird abgeschlossen…",
      keepOpen: "Bitte lass diesen Bildschirm geöffnet",
    },

    discount: {
      title: 'Rabatt wählen (optional)',
      type: 'Rabattart',
      none: 'Kein Rabatt',
      fixed: 'Fester Betrag',
      percentage: 'Prozent (%)',
      percentLabel: 'Rabatt (%)',
      amountLabel: 'Betrag (<currency/>)',
    },

    form: {
      example: 'z. B. {{value}}',
    },

    errors: {
      failed: "Die Zahlung ist fehlgeschlagen",
      refunded: "Das hat nicht geklappt. Falls etwas abgebucht wurde, wird es automatisch erstattet.",
      noGym: "Für diese Zahlung ist kein Studio ausgewählt",
      needBoth: "Wähle einen Betrag für den Bar- und den Onlineanteil",
      amountTooHigh: "Darf den fälligen Betrag nicht übersteigen",
    },
  },
} satisfies LocaleResource;

export default paymentSheet;
