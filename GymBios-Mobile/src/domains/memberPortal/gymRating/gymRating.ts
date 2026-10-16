import { create } from 'zustand';
import { apiClient } from '@/core/network/apiClient';

/** "What stood out" keys — the backend accepts only these. Labels live under gymRating.tags.* */
export const GYM_RATING_TAGS = ['clean', 'good_equipment', 'friendly_staff', 'not_crowded', 'good_value', 'good_classes'] as const;
export type GymRatingTag = (typeof GYM_RATING_TAGS)[number];

/** Must match the backend's GymReviewRequestService constants. */
export const GYM_REVIEW_REQUEST_NOTIFICATION_MODULE = 'GYM_REVIEW_REQUEST';
export const GYM_REVIEW_REQUEST_PUSH_TYPE = 'gym_review_request';

export interface MyGymRating {
  branchId: number;
  branchName: string | null;
  /** The gym asked the member to rate it and they haven't rated or closed the sheet yet. */
  pendingRequest: boolean;
  myReview: {
    rating: number;
    tags: GymRatingTag[];
    comment: string | null;
    anonymous: boolean;
    updatedAt: string | null;
  } | null;
}

export interface RateGymRequest {
  rating: number;
  tags: GymRatingTag[];
  comment: string;
  anonymous: boolean;
}

// Wire format is snake_case (spring.jackson.property-naming-strategy=SNAKE_CASE on the backend).
function map(d: any): MyGymRating {
  return {
    branchId: d.branch_id,
    branchName: d.branch_name ?? null,
    pendingRequest: !!d.pending_request,
    myReview: d.my_review
      ? {
          rating: d.my_review.rating,
          tags: d.my_review.tags ?? [],
          comment: d.my_review.comment ?? null,
          anonymous: !!d.my_review.anonymous,
          updatedAt: d.my_review.updated_at ?? null,
        }
      : null,
  };
}

// The prompt check runs in the background on every launch — never toast its failures.
const quiet = { skipGlobalErrorToast: true } as const;

export const gymRatingApi = {
  async get(): Promise<MyGymRating> {
    const response = await apiClient.get<any>('/mobile/member/gym-rating', quiet);
    return map(response.data);
  },

  async rate(request: RateGymRequest): Promise<MyGymRating> {
    const response = await apiClient.put<any>('/mobile/member/gym-rating', request);
    return map(response.data);
  },

  async dismissPrompt(): Promise<MyGymRating> {
    const response = await apiClient.post<any>('/mobile/member/gym-rating/dismiss-prompt', null, quiet);
    return map(response.data);
  },
};

/** Opens the gym rate sheet from anywhere — the notification list, a push tap, or the profile hub. */
interface GymRatingSheetState {
  open: boolean;
  show: () => void;
  hide: () => void;
}

export const useGymRatingSheet = create<GymRatingSheetState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));

export const openGymRatingSheet = () => useGymRatingSheet.getState().show();
