import type { LocaleResource } from '../en';

const common = {
  common: {
    continue: 'जारी रखें',
    save: 'सहेजें',
    optional: '(वैकल्पिक)',
    error: 'त्रुटि',
    pleaseWait: 'कृपया प्रतीक्षा करें',
  },

  language: {
    title: 'अपनी भाषा चुनें',
    subtitle: 'वह भाषा चुनें जिसमें आप सबसे सहज हैं',
    note: 'आप इसे कभी भी सेटिंग्स में बदल सकते हैं',
    save: 'सहेजें',
    settingsTitle: 'भाषा',
    settingsSubtitle: 'ऐप की भाषा चुनें',
    restartTitle: 'पुनः आरंभ आवश्यक',
    restartBody: 'लेआउट दिशा बदलने के लिए ऐप बंद करके फिर से खोलें।',
  },

  greeting: {
    welcomeBack: 'फिर से स्वागत है',
    goodMorning: 'सुप्रभात',
    goodAfternoon: 'नमस्कार',
    goodEvening: 'शुभ संध्या',
  },

  tabs: {
    home: 'होम',
    dashboard: 'डैशबोर्ड',
    bookings: 'बुकिंग',
    community: 'समुदाय',
    centers: 'केंद्र',
    subscription: 'सदस्यता',
    staff: 'स्टाफ़',
    deals: 'डील्स',
    analytics: 'एनालिटिक्स',
    schedule: 'शेड्यूल',
    performance: 'प्रदर्शन',
    ledger: 'खाता बही',
    messages: 'संदेश',
  },

  portalHeader: {
    allBranches: 'सभी शाखाएँ',
    openProfileHub: 'प्रोफ़ाइल हब खोलें',
    notificationsUnread: 'सूचनाएँ, {{count}} अपठित',
    adminTitle: 'एडमिन',
    adminSubtitle: 'कमांड सेंटर',
    memberTitle: 'सदस्य पोर्टल',
    memberSubtitle: 'आपकी फ़िटनेस यात्रा',
    trainerTitle: 'ट्रेनर पोर्टल',
    trainerSubtitle: 'कोच पोर्टल',
    staffTitle: 'स्टाफ़ पोर्टल',
    staffSubtitle: 'फ्रंट डेस्क',
  },

  validation: {
    fullNameRequired: 'पूरा नाम आवश्यक है',
    phoneRequired: 'फ़ोन नंबर आवश्यक है',
    emergencyContactRequired: 'आपातकालीन संपर्क का नाम आवश्यक है',
    emergencyPhoneRequired: 'आपातकालीन फ़ोन आवश्यक है',
    emergencyPhoneSameAsOwn: 'आपातकालीन संपर्क नंबर आपके अपने नंबर से अलग होना चाहिए',
    invalidHeight: 'मान्य ऊँचाई दर्ज करें',
    invalidWeight: 'मान्य वज़न दर्ज करें',
    heightRange: 'ऊँचाई {{min}} से {{max}} सेमी के बीच होनी चाहिए',
    weightRange: 'वज़न {{min}} से {{max}} किग्रा के बीच होना चाहिए',
    invalidDateOfBirth: 'मान्य जन्म तिथि दर्ज करें',
    minAge: 'आपकी आयु कम से कम {{min}} वर्ष होनी चाहिए',
    maxAge: 'आयु {{max}} वर्ष से अधिक नहीं हो सकती',
  },
} satisfies LocaleResource;

export default common;
