import type {
  AddFamilyMemberRequest,
  MemberFamilyRepository,
} from './MemberFamilyRepository';
import type { FamilyGroup } from '../../domain/FamilyGroup';
import type { Member } from '../../domain/Member';

export class MemberFamilyService {
  constructor(
    private readonly repository: MemberFamilyRepository,
  ) {}

  getFamily(memberId: number): Promise<FamilyGroup> {
    return this.repository.getFamily(memberId);
  }

  addFamilyMember(
    headId: number,
    request: AddFamilyMemberRequest,
  ): Promise<Member> {
    return this.repository.addFamilyMember(headId, request);
  }
}