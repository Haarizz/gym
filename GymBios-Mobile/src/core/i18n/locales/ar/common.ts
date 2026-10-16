import type { LocaleResource } from '../en';

const common = {
  common: {
    continue: 'متابعة',
    save: 'حفظ',
    optional: '(اختياري)',
    error: 'خطأ',
    pleaseWait: 'يرجى الانتظار',
  },

  language: {
    title: 'اختر لغتك',
    subtitle: 'اختر اللغة الأكثر راحة لك',
    note: 'يمكنك تغيير ذلك في أي وقت من الإعدادات',
    save: 'حفظ',
    settingsTitle: 'اللغة',
    settingsSubtitle: 'اختر لغة التطبيق',
    restartTitle: 'إعادة التشغيل مطلوبة',
    restartBody: 'أغلق التطبيق وأعد فتحه لإكمال تغيير اتجاه التخطيط.',
  },

  greeting: {
    welcomeBack: 'مرحبًا بعودتك',
    goodMorning: 'صباح الخير',
    goodAfternoon: 'مساء الخير',
    goodEvening: 'مساء الخير',
  },

  tabs: {
    home: 'الرئيسية',
    dashboard: 'لوحة التحكم',
    bookings: 'الحجوزات',
    community: 'المجتمع',
    centers: 'المراكز',
    subscription: 'الاشتراك',
    staff: 'الموظفون',
    deals: 'العروض',
    analytics: 'التحليلات',
    schedule: 'الجدول',
    performance: 'الأداء',
    ledger: 'السجل',
    messages: 'الرسائل',
  },

  portalHeader: {
    allBranches: 'جميع الفروع',
    openProfileHub: 'فتح مركز الملف الشخصي',
    notificationsUnread: 'الإشعارات، {{count}} غير مقروءة',
    adminTitle: 'المسؤول',
    adminSubtitle: 'مركز القيادة',
    memberTitle: 'بوابة الأعضاء',
    memberSubtitle: 'رحلتك نحو اللياقة',
    trainerTitle: 'بوابة المدربين',
    trainerSubtitle: 'بوابة المدرب',
    staffTitle: 'بوابة الموظفين',
    staffSubtitle: 'مكتب الاستقبال',
  },

  validation: {
    fullNameRequired: 'الاسم الكامل مطلوب',
    phoneRequired: 'رقم الهاتف مطلوب',
    emergencyContactRequired: 'اسم جهة اتصال الطوارئ مطلوب',
    emergencyPhoneRequired: 'هاتف الطوارئ مطلوب',
    emergencyPhoneSameAsOwn: 'يجب أن يختلف رقم جهة اتصال الطوارئ عن رقمك',
    invalidHeight: 'أدخل طولًا صحيحًا',
    invalidWeight: 'أدخل وزنًا صحيحًا',
    heightRange: 'يجب أن يكون الطول بين {{min}} و{{max}} سم',
    weightRange: 'يجب أن يكون الوزن بين {{min}} و{{max}} كغ',
    invalidDateOfBirth: 'أدخل تاريخ ميلاد صحيحًا',
    minAge: 'يجب ألا يقل عمرك عن {{min}} سنوات',
    maxAge: 'لا يمكن أن يزيد العمر عن {{max}} سنة',
  },
} satisfies LocaleResource;

export default common;
