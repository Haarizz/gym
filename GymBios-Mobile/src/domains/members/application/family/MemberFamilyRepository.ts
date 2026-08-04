import type { FamilyGroup } from '../../domain/FamilyGroup';
import type { Member } from '../../domain/Member';

export interface AddFamilyMemberRequest {
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  familyRole: string;
  membershipType: string;
  status: string;
  startDate: string;
}

export interface MemberFamilyRepository {
  getFamily(memberId: number): Promise<FamilyGroup>;

  addFamilyMember(
    headId: number,
    request: AddFamilyMemberRequest,
  ): Promise<Member>;
}