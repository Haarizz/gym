import type { LocaleResource } from '../en';

const gymSwitcher = {
  gymSwitcher: {
    switchGym: "जिम बदलें",
    switchGymSubtitle: "अभी {{gym}} उपयोग में",
    sheetTitle: "आपके जिम",
    sheetSubtitle: "ऐप में उपयोग के लिए जिम चुनें",
    pickerTitle: "एक जिम चुनें",
    pickerSubtitle: "आप एक से अधिक जिम के सदस्य हैं। खोलने के लिए एक चुनें — आप इसे कभी भी अपनी प्रोफ़ाइल से बदल सकते हैं।",
    current: "वर्तमान",
    joinAnother: "दूसरा जिम जॉइन करें",
    switched: "{{gym}} पर स्विच किया गया",
    ends: "{{date}} को समाप्त",
    loadFailed: "आपके जिम लोड नहीं हो सके।",
    retry: "फिर से कोशिश करें",
    signOut: "साइन आउट",
    headerSwitchA11y: "जिम बदलें। वर्तमान जिम: {{gym}}",
    status: {
      ACTIVE: "सक्रिय",
      EXPIRED: "समाप्त",
      INACTIVE: "निष्क्रिय",
      SUSPENDED: "निलंबित",
      PENDING_APPROVAL: "स्वीकृति लंबित",
      PAYMENT_REJECTED: "भुगतान अस्वीकृत",
      UNAVAILABLE: "उपलब्ध नहीं",
    },
  },
} satisfies LocaleResource;

export default gymSwitcher;
