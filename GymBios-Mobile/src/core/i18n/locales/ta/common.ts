import type { LocaleResource } from '../en';

const common = {
  common: {
    continue: 'தொடரவும்',
    save: 'சேமி',
    optional: '(விருப்பத்தேர்வு)',
    error: 'பிழை',
    pleaseWait: 'தயவுசெய்து காத்திருக்கவும்',
  },

  language: {
    title: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
    subtitle: 'உங்களுக்கு மிகவும் வசதியான மொழியைத் தேர்ந்தெடுக்கவும்',
    note: 'இதை எப்போது வேண்டுமானாலும் அமைப்புகளில் மாற்றலாம்',
    save: 'சேமி',
    settingsTitle: 'மொழி',
    settingsSubtitle: 'ஆப்பின் மொழியைத் தேர்ந்தெடுக்கவும்',
    restartTitle: 'மறுதொடக்கம் தேவை',
    restartBody: 'தளவமைப்பு திசை மாற்றத்தை முடிக்க ஆப்பை மூடி மீண்டும் திறக்கவும்.',
  },

  greeting: {
    welcomeBack: 'மீண்டும் வருக',
    goodMorning: 'காலை வணக்கம்',
    goodAfternoon: 'மதிய வணக்கம்',
    goodEvening: 'மாலை வணக்கம்',
  },

  tabs: {
    home: 'முகப்பு',
    dashboard: 'டாஷ்போர்டு',
    bookings: 'முன்பதிவுகள்',
    community: 'சமூகம்',
    centers: 'மையங்கள்',
    subscription: 'சந்தா',
    staff: 'பணியாளர்கள்',
    deals: 'சலுகைகள்',
    analytics: 'பகுப்பாய்வு',
    schedule: 'அட்டவணை',
    performance: 'செயல்திறன்',
    ledger: 'பேரேடு',
    messages: 'செய்திகள்',
  },

  portalHeader: {
    allBranches: 'அனைத்து கிளைகளும்',
    openProfileHub: 'சுயவிவர மையத்தைத் திற',
    notificationsUnread: 'அறிவிப்புகள், {{count}} படிக்கப்படாதவை',
    adminTitle: 'நிர்வாகி',
    adminSubtitle: 'கட்டளை மையம்',
    memberTitle: 'உறுப்பினர் போர்டல்',
    memberSubtitle: 'உங்கள் உடற்பயிற்சி பயணம்',
    trainerTitle: 'பயிற்சியாளர் போர்டல்',
    trainerSubtitle: 'கோச் போர்டல்',
    staffTitle: 'பணியாளர் போர்டல்',
    staffSubtitle: 'முன் மேசை',
  },

  validation: {
    fullNameRequired: 'முழுப் பெயர் தேவை',
    phoneRequired: 'தொலைபேசி எண் தேவை',
    emergencyContactRequired: 'அவசரத் தொடர்பு நபரின் பெயர் தேவை',
    emergencyPhoneRequired: 'அவசரத் தொலைபேசி எண் தேவை',
    emergencyPhoneSameAsOwn: 'அவசரத் தொடர்பு எண் உங்கள் சொந்த எண்ணிலிருந்து வேறுபட்டதாக இருக்க வேண்டும்',
    invalidHeight: 'சரியான உயரத்தை உள்ளிடவும்',
    invalidWeight: 'சரியான எடையை உள்ளிடவும்',
    heightRange: 'உயரம் {{min}} முதல் {{max}} செ.மீ வரை இருக்க வேண்டும்',
    weightRange: 'எடை {{min}} முதல் {{max}} கி.கி வரை இருக்க வேண்டும்',
    invalidDateOfBirth: 'சரியான பிறந்த தேதியை உள்ளிடவும்',
    minAge: 'உங்களுக்குக் குறைந்தது {{min}} வயது இருக்க வேண்டும்',
    maxAge: 'வயது {{max}} ஆண்டுகளுக்கு மேல் இருக்கக்கூடாது',
  },
} satisfies LocaleResource;

export default common;
