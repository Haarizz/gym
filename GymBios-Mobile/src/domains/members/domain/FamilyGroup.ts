import type { FamilyMember } from './FamilyMember';

export interface FamilyGroup {
  headId: number;
  headName: string;
  headEmail: string;
  headPhone: string;
  billingMode: string;
  totalMembers: number;
  members: FamilyMember[];
}