const paymentSheet = {
  paymentSheet: {
    title: 'Checkout',
    processingFor: 'Paying for {{title}}',
    amountDue: 'Amount due',
    howToPay: 'How would you like to pay?',
    howToPayStaff: 'How is the member paying?',
    allMethods: 'All payment methods',

    // Display only — shared/payment/constants METHOD_API_TITLES is what the API receives.
    methods: {
      card: { title: 'Card', subtitle: 'Card, Apple Pay, Google Pay' },
      upi: { title: 'UPI', subtitle: 'Any UPI app' },
      netbanking: { title: 'Net banking', subtitle: 'Pay from your bank' },
      cash: { title: 'Cash', subtitleMember: 'Pay at reception', subtitleStaff: 'Collect in person' },
      credit: { title: 'Pay later', subtitle: 'Part now, rest on account' },
      mixed: { title: 'Cash + online', subtitle: 'Split the payment' },
    },

    unavailable: {
      online: 'Not available yet',
      inrOnly: 'Only for INR payments',
      nothingToPay: 'Nothing to pay online',
    },

    online: {
      title: {
        card: 'Pay by card',
        upi: 'Pay with UPI',
        netbanking: 'Pay with net banking',
      },
      note: {
        card: 'Pay <amount/> by card, Apple Pay or Google Pay in the secure checkout.',
        upi: 'Approve <amount/> in your UPI app, then come back here.',
        netbanking: 'Choose your bank and approve <amount/>, then come back here.',
      },
      secure: 'Payments are processed securely by Stripe. Card details never reach the gym.',
    },

    cash: {
      memberTitle: 'Pay at reception',
      memberNote: "We'll send a payment request to the front desk. Pay <amount/> in cash at the reception — it's confirmed once staff receive it.",
      sendRequest: 'Send request',
      staffTitle: 'Collect cash',
      staffNote: 'Take <amount/> in cash from the member, then confirm.',
      received: 'Cash received',
    },

    credit: {
      memberNote: 'Pay part of it now if you like — the rest goes on your account once the front desk approves it.',
      staffNote: "Take part of it now if the member wants — the rest is added to their outstanding balance.",
      payNow: 'Pay now',
      nothingNow: 'Nothing',
      onAccount: 'On account',
      payNowWith: 'Pay now with',
      dueDate: 'Due date (optional)',
      selectDueDate: 'Select due date',
      request: 'Request credit',
      addToAccount: 'Add to account',
    },

    mixed: {
      memberNote: 'Pay the cash part at reception; the rest is charged online now.',
      staffNote: 'Collect the cash part first; the rest is charged online.',
      cashPart: 'Cash part',
      cash: 'Cash',
      payOnlineWith: 'Pay the rest with',
    },

    split: {
      exactAmount: 'Exact amount (<currency/>)',
      ofTotal: 'of <amount/>',
    },

    cta: {
      pay: 'Pay <amount/>',
      payNow: 'Pay <amount/> now',
      payOnline: 'Pay <amount/> online',
    },

    // Local backend simulation (payments.simulate) — shown instead of Stripe's sheet.
    simulated: {
      badge: 'TEST MODE',
      title: 'Test payment',
      note: 'Simulation — no money moves. Approve to continue as if <amount/> was paid by {{method}}.',
      approve: 'Approve test payment',
      decline: 'Decline',
    },

    processing: {
      opening: 'Opening secure checkout…',
      finishing: 'Finishing up…',
      keepOpen: 'Please keep this screen open',
    },

    discount: {
      title: 'Select Discount (Optional)',
      type: 'Discount Type',
      none: 'No Discount',
      fixed: 'Fixed Amount',
      percentage: 'Percentage (%)',
      percentLabel: 'Discount (%)',
      amountLabel: 'Amount (<currency/>)',
    },

    form: {
      example: 'e.g. {{value}}',
    },

    errors: {
      failed: 'The payment did not go through',
      refunded: "That didn't go through. If you were charged, the money is refunded automatically.",
      noGym: 'No gym is selected for this payment',
      needBoth: 'Choose an amount for both the cash and online parts',
      amountTooHigh: "Can't be more than the amount due",
    },
  },
};

export default paymentSheet;
