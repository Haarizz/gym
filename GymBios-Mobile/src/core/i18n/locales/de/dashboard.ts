const dashboard = {
  dashboard: {
    quickActionsTitle: 'Schnellaktionen',
    trainer: {
      loading: 'Dashboard wird geladen...',
      welcomeGreeting: '{{greeting}}, {{name}}! 👋',
      ratingLabel: 'Bewertung',
      review_one: '{{count}} Bewertung',
      review_other: '{{count}} Bewertungen',
      noRatings: 'Noch keine Bewertungen',
      stats: {
        sessionsToday: 'Sitzungen heute',
        todayEarnings: 'Heutige Einnahmen',
        activeMembers: 'Aktive Mitglieder',
        monthlyTarget: 'Monatsziel',
      },
      pendingTasks: {
        title: 'Ausstehende Aufgaben',
        urgent: 'Dringend',
      },
      schedule: {
        title: 'Heutiger Zeitplan',
        viewAll: 'Alle anzeigen',
        noMember: 'Kein Mitglied',
        completed: 'Abgeschlossen',
        startSession: 'Sitzung starten',
        finishSession: 'Sitzung beenden',
        finishSessionA11y: 'Sitzung mit {{name}} beenden',
        startSessionA11y: 'Sitzung mit {{name}} starten',
        messageMemberA11y: 'Nachricht an {{name}}',
      },
      quickActions: {
        messageMember: 'Mitglied benachrichtigen',
        createWorkout: 'Training erstellen',
        trackProgress: 'Fortschritt verfolgen',
        viewLedger: 'Buchhaltung ansehen',
      },
    },
    staff: {
      loading: 'Dashboard wird geladen...',
      welcomeGreeting: 'Hallo, {{name}}! 👋',
      branchLabel: 'Filiale:',
      stats: {
        leadsAdded: 'Interessenten hinzugefügt',
        followUps: 'Follow-ups',
        conversions: 'Abschlüsse',
        checkIns: 'Check-ins',
      },
      quickActions: {
        addNewLead: 'Neuen Interessenten anlegen',
        memberCheckIn: 'Mitglieder-Check-in',
      },
      urgentFollowUps: {
        title: 'Dringende Follow-ups',
        viewAll: 'Alle anzeigen',
        priorityHigh: 'HOCH',
        priorityMed: 'MITTEL',
        lastContact: 'Zuletzt: {{contact}}',
        callNow: 'Jetzt anrufen',
        callA11y: '{{name}} anrufen',
      },
      recentConversions: {
        title: 'Heutige Erfolge! 🎉',
      },
      monthlySummary: {
        title: 'Diesen Monat',
        targetAchievement: 'Zielerreichung',
        totalConversions: 'Gesamtabschlüsse',
        revenueGenerated: 'Erzielter Umsatz',
        conversionRate: 'Abschlussquote',
      },
    },
  },
};

export default dashboard;
