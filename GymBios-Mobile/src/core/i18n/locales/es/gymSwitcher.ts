import type { LocaleResource } from '../en';

const gymSwitcher = {
  gymSwitcher: {
    switchGym: "Cambiar de gimnasio",
    switchGymSubtitle: "Usando ahora {{gym}}",
    sheetTitle: "Tus gimnasios",
    sheetSubtitle: "Elige el gimnasio que quieres usar en la app",
    pickerTitle: "Elige un gimnasio",
    pickerSubtitle: "Eres socio de más de un gimnasio. Elige cuál abrir; puedes cambiar cuando quieras desde tu perfil.",
    current: "Actual",
    joinAnother: "Unirme a otro gimnasio",
    switched: "Has cambiado a {{gym}}",
    ends: "Termina el {{date}}",
    loadFailed: "No se pudieron cargar tus gimnasios.",
    retry: "Reintentar",
    signOut: "Cerrar sesión",
    headerSwitchA11y: "Cambiar de gimnasio. Gimnasio actual: {{gym}}",
    status: {
      ACTIVE: "Activa",
      EXPIRED: "Vencida",
      INACTIVE: "Inactiva",
      SUSPENDED: "Suspendida",
      PENDING_APPROVAL: "Pendiente de aprobación",
      PAYMENT_REJECTED: "Pago rechazado",
      UNAVAILABLE: "No disponible",
    },
  },
} satisfies LocaleResource;

export default gymSwitcher;
