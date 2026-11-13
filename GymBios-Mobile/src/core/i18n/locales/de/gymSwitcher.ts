import type { LocaleResource } from '../en';

const gymSwitcher = {
  gymSwitcher: {
    switchGym: "Studio wechseln",
    switchGymSubtitle: "Aktuell: {{gym}}",
    sheetTitle: "Deine Studios",
    sheetSubtitle: "Wähle das Studio, das du in der App nutzen möchtest",
    pickerTitle: "Studio auswählen",
    pickerSubtitle: "Du bist Mitglied in mehr als einem Studio. Wähle eins aus – du kannst jederzeit in deinem Profil wechseln.",
    current: "Aktuell",
    joinAnother: "Einem weiteren Studio beitreten",
    switched: "Zu {{gym}} gewechselt",
    ends: "Endet am {{date}}",
    loadFailed: "Deine Studios konnten nicht geladen werden.",
    retry: "Erneut versuchen",
    signOut: "Abmelden",
    headerSwitchA11y: "Studio wechseln. Aktuelles Studio: {{gym}}",
    status: {
      ACTIVE: "Aktiv",
      EXPIRED: "Abgelaufen",
      INACTIVE: "Inaktiv",
      SUSPENDED: "Gesperrt",
      CANCELLED: "Gekündigt",
      PENDING_APPROVAL: "Wartet auf Freigabe",
      PAYMENT_REJECTED: "Zahlung abgelehnt",
      UNAVAILABLE: "Nicht verfügbar",
    },
  },
} satisfies LocaleResource;

export default gymSwitcher;
