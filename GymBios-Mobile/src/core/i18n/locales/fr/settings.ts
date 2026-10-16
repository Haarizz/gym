import type { LocaleResource } from '../en';

const settings = {
  settings: {
    title: 'Paramètres',
    subtitle: 'Langue, notifications, comptes liés et confidentialité',
    languageCard: 'Langue',
    appLanguage: 'Langue de l’application',
    appLanguageDescription: 'Utilisée pour les menus, boutons et messages',
    notificationsCard: 'Préférences de notification',
    emailNotifications: 'Notifications par e-mail',
    emailNotificationsDescription: 'Recevoir des résumés et des mises à jour du compte par e-mail',
    pushNotifications: 'Notifications push',
    pushNotificationsDescription: 'Alertes en temps réel sur cet appareil',
    smsNotifications: 'Notifications SMS',
    smsNotificationsDescription: 'Alertes urgentes de sécurité et de paie par SMS',
    performanceUpdates: 'Suivi des performances',
    performanceUpdatesDescription: 'Notifications trimestrielles et mensuelles des scores KPI',
    targetReminders: 'Rappels d’objectifs',
    targetRemindersDescription: 'Alertes à l’approche des échéances',
    payrollEarnings: 'Paie et revenus',
    payrollEarningsDescription: 'Notifications lors du traitement des salaires et primes',
    linkedAccountsCard: 'Comptes liés',
    connected: 'Connecté',
    privacyCard: 'Confidentialité',
    profileVisibility: 'Visibilité du profil',
    profileVisibilityDescription: 'Autoriser l’équipe et le personnel à voir votre profil',
    performanceVisibility: 'Visibilité des performances',
    performanceVisibilityDescription: 'Partager vos réussites et votre score dans le classement',
    activityStatus: 'Statut d’activité',
    activityStatusDescription: 'Afficher un indicateur d’activité lorsque vous êtes connecté',
  },
} satisfies LocaleResource;

export default settings;
