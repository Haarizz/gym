import type { LocaleResource } from '../en';

const paymentSheet = {
  paymentSheet: {
    title: "भुगतान",
    processingFor: "{{title}} के लिए भुगतान",
    amountDue: "देय राशि",
    howToPay: "आप कैसे भुगतान करना चाहेंगे?",
    howToPayStaff: "सदस्य कैसे भुगतान कर रहे हैं?",
    allMethods: "सभी भुगतान तरीके",

    methods: {
      card: { title: "कार्ड", subtitle: "कार्ड, Apple Pay, Google Pay" },
      upi: { title: "UPI", subtitle: "कोई भी UPI ऐप" },
      netbanking: { title: "नेट बैंकिंग", subtitle: "अपने बैंक से भुगतान करें" },
      cash: { title: "नकद", subtitleMember: "रिसेप्शन पर भुगतान करें", subtitleStaff: "व्यक्तिगत रूप से लें" },
      credit: { title: "बाद में भुगतान", subtitle: "कुछ अभी, बाकी खाते में" },
      mixed: { title: "नकद + ऑनलाइन", subtitle: "भुगतान बाँटें" },
    },

    unavailable: {
      online: "अभी उपलब्ध नहीं",
      inrOnly: "केवल INR भुगतान के लिए",
      nothingToPay: "ऑनलाइन भुगतान के लिए कुछ नहीं",
    },

    online: {
      title: {
        card: "कार्ड से भुगतान करें",
        upi: "UPI से भुगतान करें",
        netbanking: "नेट बैंकिंग से भुगतान करें",
      },
      note: {
        card: "सुरक्षित चेकआउट में कार्ड, Apple Pay या Google Pay से <amount/> का भुगतान करें।",
        upi: "अपने UPI ऐप में <amount/> स्वीकृत करें, फिर यहाँ लौटें।",
        netbanking: "अपना बैंक चुनें, <amount/> स्वीकृत करें, फिर यहाँ लौटें।",
      },
      secure: "भुगतान Stripe द्वारा सुरक्षित रूप से प्रोसेस होते हैं। कार्ड विवरण जिम तक कभी नहीं पहुँचते।",
    },

    cash: {
      memberTitle: "रिसेप्शन पर भुगतान करें",
      memberNote: "हम फ्रंट डेस्क को भुगतान अनुरोध भेजेंगे। रिसेप्शन पर <amount/> नकद दें — स्टाफ को राशि मिलने पर पुष्टि हो जाएगी।",
      sendRequest: "अनुरोध भेजें",
      staffTitle: "नकद लें",
      staffNote: "सदस्य से <amount/> नकद लें, फिर पुष्टि करें।",
      received: "नकद मिल गया",
    },

    credit: {
      memberNote: "चाहें तो कुछ हिस्सा अभी दें — बाकी रिसेप्शन की मंज़ूरी के बाद आपके खाते में जुड़ जाएगा।",
      staffNote: "सदस्य चाहें तो कुछ हिस्सा अभी लें — बाकी उनके बकाया में जुड़ जाएगा।",
      payNow: "अभी भुगतान करें",
      nothingNow: "कुछ नहीं",
      onAccount: "खाते में",
      payNowWith: "अभी भुगतान करें",
      dueDate: "देय तिथि (वैकल्पिक)",
      selectDueDate: "देय तिथि चुनें",
      request: "क्रेडिट का अनुरोध करें",
      addToAccount: "खाते में जोड़ें",
    },

    mixed: {
      memberNote: "नकद हिस्सा रिसेप्शन पर दें; बाकी अभी ऑनलाइन लिया जाएगा।",
      staffNote: "पहले नकद हिस्सा लें; बाकी ऑनलाइन लिया जाएगा।",
      cashPart: "नकद हिस्सा",
      cash: "नकद",
      payOnlineWith: "बाकी का भुगतान",
    },

    split: {
      exactAmount: "सटीक राशि (<currency/>)",
      ofTotal: "<amount/> में से",
    },

    cta: {
      pay: "<amount/> का भुगतान करें",
      payNow: "अभी <amount/> का भुगतान करें",
      payOnline: "<amount/> ऑनलाइन भुगतान करें",
    },

    simulated: {
      badge: "टेस्ट मोड",
      title: "टेस्ट भुगतान",
      note: "सिमुलेशन — कोई पैसा नहीं कटता। आगे बढ़ने के लिए स्वीकृत करें, जैसे <amount/> का भुगतान {{method}} से हुआ हो।",
      approve: "टेस्ट भुगतान स्वीकृत करें",
      decline: "अस्वीकार करें",
    },

    processing: {
      opening: "सुरक्षित चेकआउट खुल रहा है…",
      finishing: "पूरा किया जा रहा है…",
      keepOpen: "कृपया यह स्क्रीन खुली रखें",
    },

    discount: {
      title: 'छूट चुनें (वैकल्पिक)',
      type: 'छूट का प्रकार',
      none: 'कोई छूट नहीं',
      fixed: 'निश्चित राशि',
      percentage: 'प्रतिशत (%)',
      percentLabel: 'छूट (%)',
      amountLabel: 'राशि (<currency/>)',
    },

    form: {
      example: 'जैसे {{value}}',
    },

    errors: {
      failed: "भुगतान पूरा नहीं हुआ",
      refunded: "यह पूरा नहीं हुआ। अगर पैसा कटा है, तो वह अपने आप वापस हो जाएगा।",
      noGym: "इस भुगतान के लिए कोई जिम चुना नहीं गया है",
      needBoth: "नकद और ऑनलाइन दोनों हिस्सों के लिए राशि चुनें",
      amountTooHigh: "देय राशि से अधिक नहीं हो सकती",
    },
  },
} satisfies LocaleResource;

export default paymentSheet;
