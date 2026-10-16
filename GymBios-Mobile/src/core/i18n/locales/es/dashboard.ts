const dashboard = {
  dashboard: {
    quickActionsTitle: 'Acciones rápidas',
    trainer: {
      loading: 'Cargando panel...',
      welcomeGreeting: '¡{{greeting}}, {{name}}! 👋',
      ratingLabel: 'Calificación',
      review_one: '{{count}} reseña',
      review_other: '{{count}} reseñas',
      noRatings: 'Sin calificaciones aún',
      stats: {
        sessionsToday: 'Sesiones de hoy',
        todayEarnings: 'Ganancias de hoy',
        activeMembers: 'Miembros activos',
        monthlyTarget: 'Objetivo mensual',
      },
      pendingTasks: {
        title: 'Tareas pendientes',
        urgent: 'Urgente',
      },
      schedule: {
        title: 'Horario de hoy',
        viewAll: 'Ver todo',
        noMember: 'Sin miembro',
        completed: 'Completado',
        startSession: 'Iniciar sesión',
        finishSession: 'Finalizar sesión',
        finishSessionA11y: 'Finalizar sesión con {{name}}',
        startSessionA11y: 'Iniciar sesión con {{name}}',
        messageMemberA11y: 'Enviar mensaje a {{name}}',
      },
      quickActions: {
        messageMember: 'Enviar mensaje a miembro',
        createWorkout: 'Crear entrenamiento',
        trackProgress: 'Seguir progreso',
        viewLedger: 'Ver libro contable',
      },
    },
    staff: {
      loading: 'Cargando panel...',
      welcomeGreeting: '¡Hola, {{name}}! 👋',
      branchLabel: 'Sucursal:',
      stats: {
        leadsAdded: 'Prospectos agregados',
        followUps: 'Seguimientos',
        conversions: 'Conversiones',
        checkIns: 'Registros de entrada',
      },
      quickActions: {
        addNewLead: 'Nuevo prospecto',
        memberCheckIn: 'Registro de miembro',
      },
      urgentFollowUps: {
        title: 'Seguimientos urgentes',
        viewAll: 'Ver todo',
        priorityHigh: 'ALTA',
        priorityMed: 'MEDIA',
        lastContact: 'Último: {{contact}}',
        callNow: 'Llamar ahora',
        callA11y: 'Llamar a {{name}}',
      },
      recentConversions: {
        title: '¡Éxitos de hoy! 🎉',
      },
      monthlySummary: {
        title: 'Este mes',
        targetAchievement: 'Logro de objetivos',
        totalConversions: 'Conversiones totales',
        revenueGenerated: 'Ingresos generados',
        conversionRate: 'Tasa de conversión',
      },
    },
  },
};

export default dashboard;
