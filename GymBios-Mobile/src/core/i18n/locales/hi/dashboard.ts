const dashboard = {
  dashboard: {
    quickActionsTitle: 'त्वरित कार्रवाई',
    trainer: {
      loading: 'डैशबोर्ड लोड हो रहा है...',
      welcomeGreeting: '{{greeting}}, {{name}}! 👋',
      ratingLabel: 'रेटिंग',
      review_one: '{{count}} समीक्षा',
      review_other: '{{count}} समीक्षाएं',
      noRatings: 'अभी कोई रेटिंग नहीं',
      stats: {
        sessionsToday: 'आज के सत्र',
        todayEarnings: 'आज की कमाई',
        activeMembers: 'सक्रिय सदस्य',
        monthlyTarget: 'मासिक लक्ष्य',
      },
      pendingTasks: {
        title: 'लंबित कार्य',
        urgent: 'अति आवश्यक',
      },
      schedule: {
        title: 'आज का शेड्यूल',
        viewAll: 'सभी देखें',
        noMember: 'कोई सदस्य नहीं',
        completed: 'पूर्ण हुआ',
        startSession: 'सत्र शुरू करें',
        finishSession: 'सत्र समाप्त करें',
        finishSessionA11y: '{{name}} के साथ सत्र समाप्त करें',
        startSessionA11y: '{{name}} के साथ सत्र शुरू करें',
        messageMemberA11y: '{{name}} को संदेश भेजें',
      },
      quickActions: {
        messageMember: 'सदस्य को संदेश भेजें',
        createWorkout: 'वर्कआउट बनाएं',
        trackProgress: 'प्रगति ट्रैक करें',
        viewLedger: 'बहीखाता देखें',
      },
    },
    staff: {
      loading: 'डैशबोर्ड लोड हो रहा है...',
      welcomeGreeting: 'नमस्ते, {{name}}! 👋',
      branchLabel: 'शाखा:',
      stats: {
        leadsAdded: 'जोड़े गए लीड्स',
        followUps: 'फॉलो-अप',
        conversions: 'रूपांतरण',
        checkIns: 'चेक-इन',
      },
      quickActions: {
        addNewLead: 'नया लीड जोड़ें',
        memberCheckIn: 'सदस्य चेक-इन',
      },
      urgentFollowUps: {
        title: 'जरूरी फॉलो-अप',
        viewAll: 'सभी देखें',
        priorityHigh: 'उच्च',
        priorityMed: 'मध्यम',
        lastContact: 'अंतिम: {{contact}}',
        callNow: 'अभी कॉल करें',
        callA11y: '{{name}} को कॉल करें',
      },
      recentConversions: {
        title: 'आज की सफलताएं! 🎉',
      },
      monthlySummary: {
        title: 'इस महीने',
        targetAchievement: 'लक्ष्य प्राप्ति',
        totalConversions: 'कुल रूपांतरण',
        revenueGenerated: 'अर्जित राजस्व',
        conversionRate: 'रूपांतरण दर',
      },
    },
  },
};

export default dashboard;
