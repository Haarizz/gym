import type { LocaleResource } from '../en';

const gymRating = {
  gymRating: {
    title: 'قيّم {{name}}',
    subtitle: 'كيف كانت تجربتك مؤخرًا؟',
    gymFallback: 'صالتك',
    posted: 'شكرًا! تم نشر مراجعتك.',
    tags: {
      clean: 'نظيف',
      good_equipment: 'معدات جيدة',
      friendly_staff: 'موظفون ودودون',
      not_crowded: 'غير مزدحم',
      good_value: 'قيمة جيدة',
      good_classes: 'حصص جيدة',
    },
  },
} satisfies LocaleResource;

export default gymRating;
