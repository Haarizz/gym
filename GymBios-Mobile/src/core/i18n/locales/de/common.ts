import type { LocaleResource } from '../en';

const common = {
  common: {
    continue: 'Weiter',
    save: 'Speichern',
    optional: '(optional)',
    error: 'Fehler',
    pleaseWait: 'Bitte warten',
  },

  language: {
    title: 'Wähle deine Sprache',
    subtitle: 'Wähle die Sprache, mit der du dich am wohlsten fühlst',
    note: 'Du kannst das jederzeit in den Einstellungen ändern',
    save: 'Speichern',
    settingsTitle: 'Sprache',
    settingsSubtitle: 'App-Sprache auswählen',
    restartTitle: 'Neustart erforderlich',
    restartBody: 'Schließe die App und öffne sie erneut, um die Layoutrichtung zu übernehmen.',
  },

  greeting: {
    welcomeBack: 'Willkommen zurück',
    goodMorning: 'Guten Morgen',
    goodAfternoon: 'Guten Tag',
    goodEvening: 'Guten Abend',
  },

  tabs: {
    home: 'Start',
    dashboard: 'Dashboard',
    bookings: 'Buchungen',
    community: 'Community',
    centers: 'Studios',
    subscription: 'Abo',
    staff: 'Personal',
    deals: 'Angebote',
    analytics: 'Analysen',
    schedule: 'Zeitplan',
    performance: 'Leistung',
    ledger: 'Kassenbuch',
    messages: 'Nachrichten',
  },

  portalHeader: {
    allBranches: 'Alle Filialen',
    openProfileHub: 'Profilbereich öffnen',
    notificationsUnread: 'Benachrichtigungen, {{count}} ungelesen',
    adminTitle: 'Admin',
    adminSubtitle: 'Kommandozentrale',
    memberTitle: 'Mitgliederportal',
    memberSubtitle: 'Deine Fitnessreise',
    trainerTitle: 'Trainerportal',
    trainerSubtitle: 'Coach-Portal',
    staffTitle: 'Mitarbeiterportal',
    staffSubtitle: 'Empfang',
  },

  validation: {
    fullNameRequired: 'Vollständiger Name ist erforderlich',
    phoneRequired: 'Telefonnummer ist erforderlich',
    emergencyContactRequired: 'Name des Notfallkontakts ist erforderlich',
    emergencyPhoneRequired: 'Notfallnummer ist erforderlich',
    emergencyPhoneSameAsOwn: 'Die Notfallnummer muss sich von deiner eigenen Nummer unterscheiden',
    invalidHeight: 'Gib eine gültige Größe ein',
    invalidWeight: 'Gib ein gültiges Gewicht ein',
    heightRange: 'Die Größe muss zwischen {{min}} und {{max}} cm liegen',
    weightRange: 'Das Gewicht muss zwischen {{min}} und {{max}} kg liegen',
    invalidDateOfBirth: 'Gib ein gültiges Geburtsdatum ein',
    minAge: 'Du musst mindestens {{min}} Jahre alt sein',
    maxAge: 'Das Alter darf nicht über {{max}} Jahren liegen',
  },
} satisfies LocaleResource;

export default common;
