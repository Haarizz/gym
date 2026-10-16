const dashboard = {
  dashboard: {
    quickActionsTitle: 'Actions rapides',
    trainer: {
      loading: 'Chargement du tableau de bord...',
      welcomeGreeting: '{{greeting}}, {{name}} ! 👋',
      ratingLabel: 'Note',
      review_one: '{{count}} avis',
      review_other: '{{count}} avis',
      noRatings: 'Aucune note pour le moment',
      stats: {
        sessionsToday: "Séances d'aujourd'hui",
        todayEarnings: "Revenus d'aujourd'hui",
        activeMembers: 'Membres actifs',
        monthlyTarget: 'Objectif mensuel',
      },
      pendingTasks: {
        title: 'Tâches en attente',
        urgent: 'Urgent',
      },
      schedule: {
        title: "Planning d'aujourd'hui",
        viewAll: 'Tout afficher',
        noMember: 'Aucun membre',
        completed: 'Terminé',
        startSession: 'Démarrer la séance',
        finishSession: 'Terminer la séance',
        finishSessionA11y: 'Terminer la séance avec {{name}}',
        startSessionA11y: 'Démarrer la séance avec {{name}}',
        messageMemberA11y: 'Envoyer un message à {{name}}',
      },
      quickActions: {
        messageMember: 'Envoyer un message',
        createWorkout: 'Créer un entraînement',
        trackProgress: 'Suivre les progrès',
        viewLedger: 'Voir le registre',
      },
    },
    staff: {
      loading: 'Chargement du tableau de bord...',
      welcomeGreeting: 'Bonjour, {{name}} ! 👋',
      branchLabel: 'Succursale :',
      stats: {
        leadsAdded: 'Prospects ajoutés',
        followUps: 'Relances',
        conversions: 'Conversions',
        checkIns: 'Enregistrements',
      },
      quickActions: {
        addNewLead: 'Ajouter un prospect',
        memberCheckIn: 'Enregistrement membre',
      },
      urgentFollowUps: {
        title: 'Relances urgentes',
        viewAll: 'Tout afficher',
        priorityHigh: 'ÉLEVÉE',
        priorityMed: 'MOYENNE',
        lastContact: 'Dernier contact : {{contact}}',
        callNow: 'Appeler maintenant',
        callA11y: 'Appeler {{name}}',
      },
      recentConversions: {
        title: "Succès d'aujourd'hui ! 🎉",
      },
      monthlySummary: {
        title: 'Ce mois-ci',
        targetAchievement: "Atteinte de l'objectif",
        totalConversions: 'Conversions totales',
        revenueGenerated: 'Revenus générés',
        conversionRate: 'Taux de conversion',
      },
    },
  },
};

export default dashboard;
