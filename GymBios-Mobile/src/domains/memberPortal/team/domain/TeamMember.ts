export interface TeamMember {
  id: number;
  name: string;
  role: string;
  department: string | null;
  photoUrl: string | null;
  joinDate: string | null;
  /** Certification names, shown as tags. */
  certifications: string[];
  /** Null until someone rates them. */
  averageRating: number | null;
  ratingCount: number;
  /** The signed-in member's own rating, if they've rated this person. */
  myRating: number | null;
}

export interface StaffReview {
  id: number;
  /** Null for someone else's anonymous review. */
  authorName: string | null;
  anonymous: boolean;
  mine: boolean;
  rating: number;
  tags: StaffRatingTag[];
  comment: string | null;
  updatedAt: string | null;
}

export interface StaffProfile {
  staff: TeamMember;
  /** Count per star value; index 0 = 1 star. */
  distribution: number[];
  /** Most picked "what stood out" tags, most picked first. */
  topTags: { tag: StaffRatingTag; count: number }[];
  reviews: StaffReview[];
  myReview: StaffReview | null;
}

export interface RateStaffRequest {
  rating: number;
  tags: StaffRatingTag[];
  comment: string;
  anonymous: boolean;
}

/** "What stood out" keys — the backend accepts only these. Labels live under team.tags.* */
export const TRAINER_TAGS = ['motivating', 'knows_form', 'punctual', 'good_plans', 'patient', 'fun_sessions'] as const;
export const STAFF_TAGS = ['helpful', 'quick', 'polite', 'clear_answers', 'friendly', 'knowledgeable'] as const;
export type StaffRatingTag = (typeof TRAINER_TAGS)[number] | (typeof STAFF_TAGS)[number];

/** Role is free text ("Trainer", "TRAINER", "Personal Trainer", "Yoga Coach"...). */
export function isTrainer(role: string | null | undefined): boolean {
  const r = (role ?? '').toLowerCase();
  return r.includes('trainer') || r.includes('coach') || r.includes('instructor');
}

export function tagsForRole(role: string | null | undefined): readonly StaffRatingTag[] {
  return isTrainer(role) ? TRAINER_TAGS : STAFF_TAGS;
}

export function initialsOf(name: string): string {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
}
