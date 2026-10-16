const dashboard = {
  dashboard: {
    quickActionsTitle: 'Quick Actions',
    trainer: {
      loading: 'Loading dashboard...',
      welcomeGreeting: '{{greeting}}, {{name}}! 👋',
      ratingLabel: 'Rating',
      review_one: '{{count}} review',
      review_other: '{{count}} reviews',
      noRatings: 'No ratings yet',
      stats: {
        sessionsToday: 'Sessions Today',
        todayEarnings: "Today's Earnings",
        activeMembers: 'Active Members',
        monthlyTarget: 'Monthly Target',
      },
      pendingTasks: {
        title: 'Pending Tasks',
        urgent: 'Urgent',
      },
      schedule: {
        title: "Today's Schedule",
        viewAll: 'View All',
        noMember: 'No Member',
        completed: 'Completed',
        startSession: 'Start Session',
        finishSession: 'Finish Session',
        finishSessionA11y: 'Finish session with {{name}}',
        startSessionA11y: 'Start session with {{name}}',
        messageMemberA11y: 'Message {{name}}',
      },
      quickActions: {
        messageMember: 'Message Member',
        createWorkout: 'Create Workout',
        trackProgress: 'Track Progress',
        viewLedger: 'View Ledger',
      },
    },
    staff: {
      loading: 'Loading dashboard...',
      welcomeGreeting: 'Hello, {{name}}! 👋',
      branchLabel: 'Branch:',
      stats: {
        leadsAdded: 'Leads Added',
        followUps: 'Follow-ups',
        conversions: 'Conversions',
        checkIns: 'Check-ins',
      },
      quickActions: {
        addNewLead: 'Add New Lead',
        memberCheckIn: 'Member Check-in',
      },
      urgentFollowUps: {
        title: 'Urgent Follow-ups',
        viewAll: 'View All',
        priorityHigh: 'HIGH',
        priorityMed: 'MED',
        lastContact: 'Last: {{contact}}',
        callNow: 'Call Now',
        callA11y: 'Call {{name}}',
      },
      recentConversions: {
        title: "Today's Wins! 🎉",
      },
      monthlySummary: {
        title: 'This Month',
        targetAchievement: 'Target Achievement',
        totalConversions: 'Total Conversions',
        revenueGenerated: 'Revenue Generated',
        conversionRate: 'Conversion Rate',
      },
    },
  },
};

export default dashboard;
