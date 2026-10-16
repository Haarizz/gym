import type { LocaleResource } from '../en';

const gymRating = {
  gymRating: {
    title: '{{name}} को रेट करें',
    subtitle: 'हाल में आपका अनुभव कैसा रहा?',
    gymFallback: 'आपका जिम',
    posted: 'धन्यवाद! आपकी समीक्षा पोस्ट हो गई।',
    tags: {
      clean: 'साफ़-सुथरा',
      good_equipment: 'अच्छे उपकरण',
      friendly_staff: 'मिलनसार स्टाफ़',
      not_crowded: 'भीड़ नहीं',
      good_value: 'पैसे वसूल',
      good_classes: 'अच्छी क्लासें',
    },
  },
} satisfies LocaleResource;

export default gymRating;
