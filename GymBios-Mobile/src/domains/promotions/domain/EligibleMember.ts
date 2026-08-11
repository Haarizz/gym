export interface EligibleMemberCurrentPlan {
  name: string;
  durationMonths: number;
}

export interface EligibleMember {
  id: string;
  name?: string | null;
  email?: string | null;
  membershipType?: string | null;
  joinedAt?: string | null;
  currentPlan?: EligibleMemberCurrentPlan | null;
  renewalCount?: number | null;
  purchaseDate?: string | null;
}
