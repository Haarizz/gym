import type { LocaleResource } from '../en';

const gymSwitcher = {
  gymSwitcher: {
    switchGym: "Changer de salle",
    switchGymSubtitle: "Salle actuelle : {{gym}}",
    sheetTitle: "Vos salles",
    sheetSubtitle: "Choisissez la salle à utiliser dans l'app",
    pickerTitle: "Choisissez une salle",
    pickerSubtitle: "Vous êtes membre de plusieurs salles. Choisissez celle à ouvrir — vous pourrez changer à tout moment depuis votre profil.",
    current: "Actuelle",
    joinAnother: "Rejoindre une autre salle",
    switched: "Vous êtes passé à {{gym}}",
    ends: "Se termine le {{date}}",
    loadFailed: "Impossible de charger vos salles.",
    retry: "Réessayer",
    signOut: "Se déconnecter",
    headerSwitchA11y: "Changer de salle. Salle actuelle : {{gym}}",
    status: {
      ACTIVE: "Active",
      EXPIRED: "Expirée",
      INACTIVE: "Inactive",
      SUSPENDED: "Suspendue",
      CANCELLED: "Résilié",
      PENDING_APPROVAL: "En attente de validation",
      PAYMENT_REJECTED: "Paiement refusé",
      UNAVAILABLE: "Indisponible",
    },
  },
} satisfies LocaleResource;

export default gymSwitcher;
