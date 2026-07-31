import type {
  FamilyRenewalRequest,
  MemberMembershipRepository,
  MinorRenewalRequest,
  RenewalRequest,
} from './MemberMembershipRepository';
import type { Member } from '../../domain/Member';

export class MemberMembershipService {
  constructor(
    private readonly repository: MemberMembershipRepository,
  ) {}

  renewMember(id: number, request: RenewalRequest): Promise<Member> {
    return this.repository.renewMember(id, request);
  }

  renewMinor(id: number, request: MinorRenewalRequest): Promise<Member> {
    return this.repository.renewMinor(id, request);
  }

  renewFamily(headId: number, request: FamilyRenewalRequest): Promise<Member> {
    return this.repository.renewFamily(headId, request);
  }
}