import type { LocaleResource } from '../en';

const gymSwitcher = {
  gymSwitcher: {
    switchGym: "تبديل النادي",
    switchGymSubtitle: "تستخدم الآن {{gym}}",
    sheetTitle: "أنديتك",
    sheetSubtitle: "اختر النادي الذي تريد استخدامه في التطبيق",
    pickerTitle: "اختر ناديًا",
    pickerSubtitle: "أنت عضو في أكثر من نادٍ. اختر النادي الذي تريد فتحه — يمكنك التبديل في أي وقت من ملفك الشخصي.",
    current: "الحالي",
    joinAnother: "انضم إلى نادٍ آخر",
    switched: "تم التبديل إلى {{gym}}",
    ends: "ينتهي في {{date}}",
    loadFailed: "تعذّر تحميل أنديتك.",
    retry: "حاول مرة أخرى",
    signOut: "تسجيل الخروج",
    headerSwitchA11y: "تبديل النادي. النادي الحالي: {{gym}}",
    status: {
      ACTIVE: "نشط",
      EXPIRED: "منتهي",
      INACTIVE: "غير نشط",
      SUSPENDED: "موقوف",
      PENDING_APPROVAL: "بانتظار الموافقة",
      PAYMENT_REJECTED: "رُفض الدفع",
      UNAVAILABLE: "غير متاح",
    },
  },
} satisfies LocaleResource;

export default gymSwitcher;
