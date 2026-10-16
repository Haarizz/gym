import type { LocaleResource } from '../en';

const gymRating = {
  gymRating: {
    title: '评价 {{name}}',
    subtitle: '最近你的体验如何？',
    gymFallback: '你的健身房',
    posted: '感谢！你的评价已发布。',
    tags: {
      clean: '干净整洁',
      good_equipment: '器械优质',
      friendly_staff: '员工热情',
      not_crowded: '不拥挤',
      good_value: '性价比高',
      good_classes: '课程丰富',
    },
  },
} satisfies LocaleResource;

export default gymRating;
