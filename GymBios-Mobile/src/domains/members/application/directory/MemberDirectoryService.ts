import type {
  CreateMemberRequest,
  MemberDirectoryRepository,
  MemberFilters,
  UpdateMemberRequest,
} from './MemberDirectoryRepository';
import type { Member, MemberPage } from '../../domain/Member';

export class MemberDirectoryService {
  constructor(
    private readonly repository: MemberDirectoryRepository,
  ) {}

  getMembers(filters?: MemberFilters): Promise<MemberPage> {
    return this.repository.getMembers(filters);
  }

  getMember(id: number): Promise<Member> {
    return this.repository.getMember(id);
  }

  getCurrentMember(): Promise<Member> {
    return this.repository.getCurrentMember();
  }

  getMemberByUser(userId: number): Promise<Member> {
    return this.repository.getMemberByUser(userId);
  }

  createMember(request: CreateMemberRequest): Promise<Member> {
    return this.repository.createMember(request);
  }

  updateMember(id: number, request: UpdateMemberRequest): Promise<Member> {
    return this.repository.updateMember(id, request);
  }

  deleteMember(id: number): Promise<void> {
    return this.repository.deleteMember(id);
  }
}