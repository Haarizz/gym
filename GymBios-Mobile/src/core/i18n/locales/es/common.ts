import type { LocaleResource } from '../en';

const common = {
  common: {
    continue: 'Continuar',
    save: 'Guardar',
    optional: '(opcional)',
    error: 'Error',
    pleaseWait: 'Espera un momento',
  },

  language: {
    title: 'Elige tu idioma',
    subtitle: 'Elige el idioma con el que te sientas más cómodo',
    note: 'Puedes cambiarlo cuando quieras en Ajustes',
    save: 'Guardar',
    settingsTitle: 'Idioma',
    settingsSubtitle: 'Elige el idioma de la app',
    restartTitle: 'Es necesario reiniciar',
    restartBody: 'Cierra y vuelve a abrir la app para terminar de cambiar la dirección del diseño.',
  },

  greeting: {
    welcomeBack: 'Bienvenido de nuevo',
    goodMorning: 'Buenos días',
    goodAfternoon: 'Buenas tardes',
    goodEvening: 'Buenas noches',
  },

  tabs: {
    home: 'Inicio',
    dashboard: 'Panel',
    bookings: 'Reservas',
    community: 'Comunidad',
    centers: 'Centros',
    subscription: 'Suscripción',
    staff: 'Personal',
    deals: 'Ofertas',
    analytics: 'Analíticas',
    schedule: 'Horario',
    performance: 'Rendimiento',
    ledger: 'Libro mayor',
    messages: 'Mensajes',
  },

  portalHeader: {
    allBranches: 'Todas las sedes',
    openProfileHub: 'Abrir el perfil',
    notificationsUnread: 'Notificaciones, {{count}} sin leer',
    adminTitle: 'Admin',
    adminSubtitle: 'Centro de mando',
    memberTitle: 'Portal de socios',
    memberSubtitle: 'Tu camino fitness',
    trainerTitle: 'Portal de entrenadores',
    trainerSubtitle: 'Portal del coach',
    staffTitle: 'Portal del personal',
    staffSubtitle: 'Recepción',
  },

  validation: {
    fullNameRequired: 'El nombre completo es obligatorio',
    phoneRequired: 'El número de teléfono es obligatorio',
    emergencyContactRequired: 'El nombre del contacto de emergencia es obligatorio',
    emergencyPhoneRequired: 'El teléfono de emergencia es obligatorio',
    emergencyPhoneSameAsOwn: 'El número de emergencia debe ser distinto de tu propio número',
    invalidHeight: 'Introduce una altura válida',
    invalidWeight: 'Introduce un peso válido',
    heightRange: 'La altura debe estar entre {{min}} y {{max}} cm',
    weightRange: 'El peso debe estar entre {{min}} y {{max}} kg',
    invalidDateOfBirth: 'Introduce una fecha de nacimiento válida',
    minAge: 'Debes tener al menos {{min}} años',
    maxAge: 'La edad no puede superar los {{max}} años',
  },
} satisfies LocaleResource;

export default common;
