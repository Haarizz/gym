import type { LocaleResource } from '../en';

const gymRating = {
  gymRating: {
    title: 'Valorar {{name}}',
    subtitle: '¿Qué tal ha sido tu experiencia últimamente?',
    gymFallback: 'tu gimnasio',
    posted: '¡Gracias! Tu reseña se ha publicado.',
    tags: {
      clean: 'Limpio',
      good_equipment: 'Buen equipamiento',
      friendly_staff: 'Personal amable',
      not_crowded: 'Sin aglomeraciones',
      good_value: 'Buena relación calidad-precio',
      good_classes: 'Buenas clases',
    },
  },
} satisfies LocaleResource;

export default gymRating;
