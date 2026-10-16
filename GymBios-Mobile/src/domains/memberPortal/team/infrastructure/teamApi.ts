import { apiClient } from '@/core/network/apiClient';
import type { RateStaffRequest, StaffProfile, StaffReview, TeamMember } from '../domain/TeamMember';

// Wire format is snake_case (spring.jackson.property-naming-strategy=SNAKE_CASE on the backend).

function mapMember(d: any): TeamMember {
  return {
    id: d.id,
    name: d.name ?? '',
    role: d.role ?? '',
    department: d.department ?? null,
    photoUrl: d.photo_url ?? null,
    joinDate: d.join_date ?? null,
    certifications: d.certifications ?? [],
    averageRating: d.average_rating ?? null,
    ratingCount: d.rating_count ?? 0,
    myRating: d.my_rating ?? null,
  };
}

function mapReview(d: any): StaffReview {
  return {
    id: d.id,
    authorName: d.author_name ?? null,
    anonymous: !!d.anonymous,
    mine: !!d.mine,
    rating: d.rating,
    tags: d.tags ?? [],
    comment: d.comment ?? null,
    updatedAt: d.updated_at ?? null,
  };
}

function mapProfile(d: any): StaffProfile {
  return {
    staff: mapMember(d.staff),
    distribution: d.distribution ?? [0, 0, 0, 0, 0],
    topTags: Object.entries(d.top_tags ?? {}).map(([tag, count]) => ({ tag: tag as any, count: Number(count) })),
    reviews: (d.reviews ?? []).map(mapReview),
    myReview: d.my_review ? mapReview(d.my_review) : null,
  };
}

export const teamApi = {
  async getTeam(): Promise<TeamMember[]> {
    const response = await apiClient.get<any[]>('/mobile/member/staff');
    return response.data.map(mapMember);
  },

  async getProfile(staffId: number): Promise<StaffProfile> {
    const response = await apiClient.get<any>(`/mobile/member/staff/${staffId}`);
    return mapProfile(response.data);
  },

  async rate(staffId: number, request: RateStaffRequest): Promise<StaffProfile> {
    const response = await apiClient.put<any>(`/mobile/member/staff/${staffId}/rating`, request);
    return mapProfile(response.data);
  },
};
