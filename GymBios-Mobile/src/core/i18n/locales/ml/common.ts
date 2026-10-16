import type { LocaleResource } from '../en';

const common = {
  common: {
    continue: 'തുടരുക',
    save: 'സേവ് ചെയ്യുക',
    optional: '(ഓപ്ഷണൽ)',
    error: 'പിശക്',
    pleaseWait: 'ദയവായി കാത്തിരിക്കുക',
  },

  language: {
    title: 'നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക',
    subtitle: 'നിങ്ങൾക്ക് ഏറ്റവും സൗകര്യപ്രദമായ ഭാഷ തിരഞ്ഞെടുക്കുക',
    note: 'ഇത് എപ്പോൾ വേണമെങ്കിലും സെറ്റിംഗ്സിൽ മാറ്റാം',
    save: 'സേവ് ചെയ്യുക',
    settingsTitle: 'ഭാഷ',
    settingsSubtitle: 'ആപ്പിന്റെ ഭാഷ തിരഞ്ഞെടുക്കുക',
    restartTitle: 'റീസ്റ്റാർട്ട് ആവശ്യമാണ്',
    restartBody: 'ലേഔട്ട് ദിശ മാറ്റം പൂർത്തിയാക്കാൻ ആപ്പ് അടച്ച് വീണ്ടും തുറക്കുക.',
  },

  greeting: {
    welcomeBack: 'വീണ്ടും സ്വാഗതം',
    goodMorning: 'സുപ്രഭാതം',
    goodAfternoon: 'ശുഭ ഉച്ചതിരിഞ്ഞ്',
    goodEvening: 'ശുഭ സായാഹ്നം',
  },

  tabs: {
    home: 'ഹോം',
    dashboard: 'ഡാഷ്‌ബോർഡ്',
    bookings: 'ബുക്കിംഗുകൾ',
    community: 'കമ്മ്യൂണിറ്റി',
    centers: 'സെന്ററുകൾ',
    subscription: 'സബ്‌സ്‌ക്രിപ്ഷൻ',
    staff: 'സ്റ്റാഫ്',
    deals: 'ഡീലുകൾ',
    analytics: 'അനലിറ്റിക്സ്',
    schedule: 'ഷെഡ്യൂൾ',
    performance: 'പ്രകടനം',
    ledger: 'ലെഡ്ജർ',
    messages: 'സന്ദേശങ്ങൾ',
  },

  portalHeader: {
    allBranches: 'എല്ലാ ബ്രാഞ്ചുകളും',
    openProfileHub: 'പ്രൊഫൈൽ ഹബ് തുറക്കുക',
    notificationsUnread: 'അറിയിപ്പുകൾ, {{count}} വായിക്കാത്തവ',
    adminTitle: 'അഡ്മിൻ',
    adminSubtitle: 'കമാൻഡ് സെന്റർ',
    memberTitle: 'അംഗ പോർട്ടൽ',
    memberSubtitle: 'നിങ്ങളുടെ ഫിറ്റ്‌നസ് യാത്ര',
    trainerTitle: 'ട്രെയിനർ പോർട്ടൽ',
    trainerSubtitle: 'കോച്ച് പോർട്ടൽ',
    staffTitle: 'സ്റ്റാഫ് പോർട്ടൽ',
    staffSubtitle: 'ഫ്രണ്ട് ഡെസ്ക്',
  },

  validation: {
    fullNameRequired: 'മുഴുവൻ പേര് ആവശ്യമാണ്',
    phoneRequired: 'ഫോൺ നമ്പർ ആവശ്യമാണ്',
    emergencyContactRequired: 'അടിയന്തര കോൺടാക്റ്റിന്റെ പേര് ആവശ്യമാണ്',
    emergencyPhoneRequired: 'അടിയന്തര ഫോൺ നമ്പർ ആവശ്യമാണ്',
    emergencyPhoneSameAsOwn: 'അടിയന്തര കോൺടാക്റ്റ് നമ്പർ നിങ്ങളുടെ സ്വന്തം നമ്പറിൽ നിന്ന് വ്യത്യസ്തമായിരിക്കണം',
    invalidHeight: 'സാധുവായ ഉയരം നൽകുക',
    invalidWeight: 'സാധുവായ ഭാരം നൽകുക',
    heightRange: 'ഉയരം {{min}} മുതൽ {{max}} സെ.മീ വരെ ആയിരിക്കണം',
    weightRange: 'ഭാരം {{min}} മുതൽ {{max}} കി.ഗ്രാം വരെ ആയിരിക്കണം',
    invalidDateOfBirth: 'സാധുവായ ജനനത്തീയതി നൽകുക',
    minAge: 'നിങ്ങൾക്ക് കുറഞ്ഞത് {{min}} വയസ്സ് ഉണ്ടായിരിക്കണം',
    maxAge: 'പ്രായം {{max}} വയസ്സിൽ കൂടരുത്',
  },
} satisfies LocaleResource;

export default common;
