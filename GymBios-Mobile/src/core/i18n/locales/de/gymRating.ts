import type { LocaleResource } from '../en';

const gymRating = {
  gymRating: {
    title: '{{name}} bewerten',
    subtitle: 'Wie war deine Erfahrung in letzter Zeit?',
    gymFallback: 'dein Studio',
    posted: 'Danke! Deine Rezension wurde veröffentlicht.',
    tags: {
      clean: 'Sauber',
      good_equipment: 'Gute Geräte',
      friendly_staff: 'Freundliches Personal',
      not_crowded: 'Nicht überfüllt',
      good_value: 'Preiswert',
      good_classes: 'Gute Kurse',
    },
  },
} satisfies LocaleResource;

export default gymRating;
