import type { LocaleResource } from '../en';

const gymRating = {
  gymRating: {
    title: 'Noter {{name}}',
    subtitle: "Comment s'est passée votre expérience récemment ?",
    gymFallback: 'votre salle',
    posted: 'Merci ! Votre avis a été publié.',
    tags: {
      clean: 'Propre',
      good_equipment: 'Bon équipement',
      friendly_staff: 'Personnel sympathique',
      not_crowded: 'Pas bondé',
      good_value: 'Bon rapport qualité-prix',
      good_classes: 'Bons cours',
    },
  },
} satisfies LocaleResource;

export default gymRating;
