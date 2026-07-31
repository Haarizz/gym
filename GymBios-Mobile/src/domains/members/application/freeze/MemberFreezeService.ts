import type {
  FreezeRequest,
  MemberFreezeRepository,
} from './MemberFreezeRepository';
import type { Member } from '../../domain/Member';

export class MemberFreezeService {
  constructor(
    private readonly repository: MemberFreezeRepository,
  ) {}

  freezeMember(id: number, request: FreezeRequest): Promise<Member> {
    return this.repository.freezeMember(id, request);
  }

  unfreezeMember(id: number): Promise<Member> {
    return this.repository.unfreezeMember(id);
  }
}