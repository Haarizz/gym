import { authService } from './auth-service';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface GymRatingSummary {
  branch_id: number;
  branch_name: string | null;
  /** Null until someone rates it. */
  average_rating: number | null;
  rating_count: number;
  /** Count per star value; index 0 = 1 star. */
  distribution: number[];
  /** "What stood out" key → how many picked it (detail views only). */
  top_tags?: Record<string, number> | null;
  last_review_at: string | null;
}

export interface GymReview {
  id: number;
  member_id: number;
  member_name: string;
  /** Other members see "Anonymous member"; gym staff and the platform admin still see the author. */
  anonymous: boolean;
  rating: number;
  tags: string[];
  comment?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface GymReviewRequestStatus {
  last_requested_at: string | null;
  last_recipient_count: number | null;
  /** When the cooldown ends; null if it can be sent now. */
  next_available_at: string | null;
  can_request: boolean;
  eligible_count: number;
  cooldown_days: number;
}

export interface GymRatingDetail {
  summary: GymRatingSummary;
  reviews: GymReview[];
  /** Gym admin only. */
  request?: GymReviewRequestStatus | null;
}

export interface PlatformGymRating {
  tenant_slug: string;
  gym_name: string;
  average_rating: number | null;
  rating_count: number;
  last_review_at: string | null;
  branches?: GymRatingSummary[] | null;
}

// English labels for the gym "What stood out" keys the mobile app sends.
export const GYM_RATING_TAG_LABELS: Record<string, string> = {
  clean: 'Clean',
  good_equipment: 'Good equipment',
  friendly_staff: 'Friendly staff',
  not_crowded: 'Not crowded',
  good_value: 'Good value',
  good_classes: 'Good classes',
};

async function readError(response: Response, fallback: string): Promise<Error> {
  try {
    const body = await response.json();
    return new Error(body?.message || fallback);
  } catch {
    return new Error(fallback);
  }
}

class RatingsService {

  // ── Gym admin: own branches ─────────────────────────────────────────────

  async getBranches(): Promise<GymRatingSummary[]> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/gym-ratings/branches`);
    if (!response.ok) throw await readError(response, `Failed to fetch ratings: ${response.status}`);
    return response.json();
  }

  async getBranch(branchId: number): Promise<GymRatingDetail> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/gym-ratings/branches/${branchId}`);
    if (!response.ok) throw await readError(response, `Failed to fetch branch ratings: ${response.status}`);
    return response.json();
  }

  async requestReviews(branchId: number): Promise<GymReviewRequestStatus> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/gym-ratings/branches/${branchId}/request-reviews`,
      { method: 'POST' },
    );
    if (!response.ok) throw await readError(response, `Failed to request reviews: ${response.status}`);
    return response.json();
  }

  // ── Platform admin: every gym ───────────────────────────────────────────

  async getPlatformGyms(): Promise<PlatformGymRating[]> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/platform/ratings`);
    if (!response.ok) throw await readError(response, `Failed to fetch gym ratings: ${response.status}`);
    return response.json();
  }

  async getPlatformGym(tenantSlug: string): Promise<PlatformGymRating> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/platform/ratings/${encodeURIComponent(tenantSlug)}`,
    );
    if (!response.ok) throw await readError(response, `Failed to fetch gym ratings: ${response.status}`);
    return response.json();
  }

  async getPlatformBranch(tenantSlug: string, branchId: number): Promise<GymRatingDetail> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/platform/ratings/${encodeURIComponent(tenantSlug)}/branches/${branchId}`,
    );
    if (!response.ok) throw await readError(response, `Failed to fetch branch ratings: ${response.status}`);
    return response.json();
  }
}

export const ratingsService = new RatingsService();
