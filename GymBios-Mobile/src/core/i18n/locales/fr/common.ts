import type { LocaleResource } from '../en';

const common = {
  common: {
    continue: 'Continuer',
    save: 'Enregistrer',
    optional: '(facultatif)',
    error: 'Erreur',
    pleaseWait: 'Veuillez patienter',
  },

  language: {
    title: 'Choisissez votre langue',
    subtitle: 'Choisissez la langue avec laquelle vous êtes le plus à l’aise',
    note: 'Vous pouvez la modifier à tout moment dans les Paramètres',
    save: 'Enregistrer',
    settingsTitle: 'Langue',
    settingsSubtitle: 'Choisir la langue de l’application',
    restartTitle: 'Redémarrage nécessaire',
    restartBody: 'Fermez puis rouvrez l’application pour appliquer le sens d’affichage.',
  },

  greeting: {
    welcomeBack: 'Bon retour',
    goodMorning: 'Bonjour',
    goodAfternoon: 'Bon après-midi',
    goodEvening: 'Bonsoir',
  },

  tabs: {
    home: 'Accueil',
    dashboard: 'Tableau de bord',
    bookings: 'Réservations',
    community: 'Communauté',
    centers: 'Centres',
    subscription: 'Abonnement',
    staff: 'Personnel',
    deals: 'Offres',
    analytics: 'Statistiques',
    schedule: 'Planning',
    performance: 'Performance',
    ledger: 'Registre',
    messages: 'Messages',
  },

  portalHeader: {
    allBranches: 'Toutes les agences',
    openProfileHub: 'Ouvrir l’espace profil',
    notificationsUnread: 'Notifications, {{count}} non lues',
    adminTitle: 'Admin',
    adminSubtitle: 'Centre de commande',
    memberTitle: 'Espace membre',
    memberSubtitle: 'Votre parcours forme',
    trainerTitle: 'Espace entraîneur',
    trainerSubtitle: 'Espace coach',
    staffTitle: 'Espace personnel',
    staffSubtitle: 'Accueil',
  },

  validation: {
    fullNameRequired: 'Le nom complet est obligatoire',
    phoneRequired: 'Le numéro de téléphone est obligatoire',
    emergencyContactRequired: 'Le nom du contact d’urgence est obligatoire',
    emergencyPhoneRequired: 'Le téléphone d’urgence est obligatoire',
    emergencyPhoneSameAsOwn: 'Le numéro du contact d’urgence doit être différent du vôtre',
    invalidHeight: 'Saisissez une taille valide',
    invalidWeight: 'Saisissez un poids valide',
    heightRange: 'La taille doit être comprise entre {{min}} et {{max}} cm',
    weightRange: 'Le poids doit être compris entre {{min}} et {{max}} kg',
    invalidDateOfBirth: 'Saisissez une date de naissance valide',
    minAge: 'Vous devez avoir au moins {{min}} ans',
    maxAge: 'L’âge ne peut pas dépasser {{max}} ans',
  },
} satisfies LocaleResource;

export default common;
