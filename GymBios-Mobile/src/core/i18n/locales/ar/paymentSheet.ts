import type { LocaleResource } from '../en';

const paymentSheet = {
  paymentSheet: {
    title: "الدفع",
    processingFor: "الدفع مقابل {{title}}",
    amountDue: "المبلغ المستحق",
    howToPay: "كيف تودّ الدفع؟",
    howToPayStaff: "كيف سيدفع العضو؟",
    allMethods: "كل طرق الدفع",

    methods: {
      card: { title: "البطاقة", subtitle: "بطاقة، Apple Pay، Google Pay" },
      upi: { title: "UPI", subtitle: "أي تطبيق UPI" },
      netbanking: { title: "الخدمات المصرفية عبر الإنترنت", subtitle: "ادفع من بنكك" },
      cash: { title: "نقدًا", subtitleMember: "ادفع في الاستقبال", subtitleStaff: "استلام نقدي مباشر" },
      credit: { title: "ادفع لاحقًا", subtitle: "جزء الآن والباقي على الحساب" },
      mixed: { title: "نقدًا + إلكترونيًا", subtitle: "قسّم الدفعة" },
    },

    unavailable: {
      online: "غير متاح بعد",
      inrOnly: "للمدفوعات بالروبية الهندية فقط",
      nothingToPay: "لا يوجد مبلغ للدفع إلكترونيًا",
    },

    online: {
      title: {
        card: "الدفع بالبطاقة",
        upi: "الدفع عبر UPI",
        netbanking: "الدفع عبر البنك",
      },
      note: {
        card: "ادفع <amount/> بالبطاقة أو Apple Pay أو Google Pay في صفحة الدفع الآمنة.",
        upi: "وافق على <amount/> في تطبيق UPI ثم عد إلى هنا.",
        netbanking: "اختر بنكك ووافق على <amount/> ثم عد إلى هنا.",
      },
      secure: "تتم معالجة المدفوعات بأمان عبر Stripe. لا تصل بيانات البطاقة إلى النادي.",
    },

    cash: {
      memberTitle: "ادفع في الاستقبال",
      memberNote: "سنرسل طلب دفع إلى مكتب الاستقبال. ادفع <amount/> نقدًا في الاستقبال — يتم التأكيد عند استلام الموظفين للمبلغ.",
      sendRequest: "إرسال الطلب",
      staffTitle: "استلام نقدي",
      staffNote: "استلم <amount/> نقدًا من العضو ثم أكّد.",
      received: "تم استلام النقد",
    },

    credit: {
      memberNote: "يمكنك دفع جزء الآن — ويُضاف الباقي إلى حسابك بعد موافقة الاستقبال.",
      staffNote: "استلم جزءًا الآن إن أراد العضو — ويُضاف الباقي إلى رصيده المستحق.",
      payNow: "ادفع الآن",
      nothingNow: "لا شيء",
      onAccount: "على الحساب",
      payNowWith: "ادفع الآن عبر",
      dueDate: "تاريخ الاستحقاق (اختياري)",
      selectDueDate: "اختر تاريخ الاستحقاق",
      request: "طلب دفع آجل",
      addToAccount: "إضافة إلى الحساب",
    },

    mixed: {
      memberNote: "ادفع الجزء النقدي في الاستقبال؛ ويُخصم الباقي إلكترونيًا الآن.",
      staffNote: "استلم الجزء النقدي أولًا؛ ويُخصم الباقي إلكترونيًا.",
      cashPart: "الجزء النقدي",
      cash: "نقدًا",
      payOnlineWith: "ادفع الباقي عبر",
    },

    split: {
      exactAmount: "المبلغ بالضبط (<currency/>)",
      ofTotal: "من <amount/>",
    },

    cta: {
      pay: "ادفع <amount/>",
      payNow: "ادفع <amount/> الآن",
      payOnline: "ادفع <amount/> إلكترونيًا",
    },

    simulated: {
      badge: "وضع الاختبار",
      title: "دفعة تجريبية",
      note: "محاكاة — لا تنتقل أي أموال. وافق للمتابعة كما لو تم دفع <amount/> عبر {{method}}.",
      approve: "الموافقة على الدفعة التجريبية",
      decline: "رفض",
    },

    processing: {
      opening: "جارٍ فتح صفحة الدفع الآمنة…",
      finishing: "جارٍ الإنهاء…",
      keepOpen: "يُرجى إبقاء هذه الشاشة مفتوحة",
    },

    discount: {
      title: 'اختر خصمًا (اختياري)',
      type: 'نوع الخصم',
      none: 'بدون خصم',
      fixed: 'مبلغ ثابت',
      percentage: 'نسبة مئوية (%)',
      percentLabel: 'الخصم (%)',
      amountLabel: 'المبلغ (<currency/>)',
    },

    form: {
      example: 'مثال: {{value}}',
    },

    errors: {
      failed: "لم تتم عملية الدفع",
      refunded: "لم تتم العملية. إذا خُصم منك مبلغ فسيُعاد تلقائيًا.",
      noGym: "لم يتم اختيار نادٍ لهذه الدفعة",
      needBoth: "اختر مبلغًا للجزأين النقدي والإلكتروني",
      amountTooHigh: "لا يمكن أن يتجاوز المبلغ المستحق",
    },
  },
} satisfies LocaleResource;

export default paymentSheet;
