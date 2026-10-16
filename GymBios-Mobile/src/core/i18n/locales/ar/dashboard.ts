const dashboard = {
  dashboard: {
    quickActionsTitle: 'إجراءات سريعة',
    trainer: {
      loading: 'جارٍ تحميل لوحة التحكم...',
      welcomeGreeting: '{{greeting}}، {{name}}! 👋',
      ratingLabel: 'التقييم',
      review_zero: 'لا توجد تقييمات',
      review_one: 'تقييم واحد',
      review_two: 'تقييمان',
      review_few: '{{count}} تقييمات',
      review_many: '{{count}} تقييماً',
      review_other: '{{count}} تقييم',
      noRatings: 'لا توجد تقييمات بعد',
      stats: {
        sessionsToday: 'جلسات اليوم',
        todayEarnings: 'أرباح اليوم',
        activeMembers: 'الأعضاء النشطون',
        monthlyTarget: 'الهدف الشهري',
      },
      pendingTasks: {
        title: 'المهام المعلقة',
        urgent: 'عاجل',
      },
      schedule: {
        title: 'جدول اليوم',
        viewAll: 'عرض الكل',
        noMember: 'لا يوجد عضو',
        completed: 'مكتمل',
        startSession: 'بدء الجلسة',
        finishSession: 'إنهاء الجلسة',
        finishSessionA11y: 'إنهاء الجلسة مع {{name}}',
        startSessionA11y: 'بدء الجلسة مع {{name}}',
        messageMemberA11y: 'مراسلة {{name}}',
      },
      quickActions: {
        messageMember: 'مراسلة العضو',
        createWorkout: 'إنشاء تمرين',
        trackProgress: 'متابعة التقدم',
        viewLedger: 'عرض السجل المالي',
      },
    },
    staff: {
      loading: 'جارٍ تحميل لوحة التحكم...',
      welcomeGreeting: 'مرحباً، {{name}}! 👋',
      branchLabel: 'الفرع:',
      stats: {
        leadsAdded: 'العملاء المحتملون الجدد',
        followUps: 'المتابعات',
        conversions: 'الاشتراكات المكتملة',
        checkIns: 'تسجيلات الحضور',
      },
      quickActions: {
        addNewLead: 'إضافة عميل محتمل',
        memberCheckIn: 'تسجيل حضور العضو',
      },
      urgentFollowUps: {
        title: 'متابعات عاجلة',
        viewAll: 'عرض الكل',
        priorityHigh: 'عالية',
        priorityMed: 'متوسطة',
        lastContact: 'آخر تواصل: {{contact}}',
        callNow: 'اتصل الآن',
        callA11y: 'الاتصال بـ {{name}}',
      },
      recentConversions: {
        title: 'إنجازات اليوم! 🎉',
      },
      monthlySummary: {
        title: 'هذا الشهر',
        targetAchievement: 'تحقيق الهدف',
        totalConversions: 'إجمالي التحويلات',
        revenueGenerated: 'الإيرادات المحققة',
        conversionRate: 'معدل التحويل',
      },
    },
  },
};

export default dashboard;
