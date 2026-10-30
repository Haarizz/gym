import type {
  MemberAccessRepository,
  MemberAppAccount,
} from './MemberAccessRepository';
import type { Member } from '../../domain/Member';

export class MemberAccessService {
  constructor(
    private readonly repository: MemberAccessRepository,
  ) {}

  getAppAccount(id: number): Promise<MemberAppAccount> {
    return this.repository.getAppAccount(id);
  }

  createAppAccount(id: number, username: string, password: string): Promise<Member> {
    if (!username.trim() || password.length < 6) {
      throw new Error('Username and a password of at least 6 characters are required');
    }
    return this.repository.createAppAccount(id, username.trim(), password);
  }

  requestAccountLink(id: number, identifier: string): Promise<MemberAppAccount> {
    return this.repository.requestAccountLink(id, identifier.trim());
  }

  cancelAccountLink(id: number): Promise<MemberAppAccount> {
    return this.repository.cancelAccountLink(id);
  }

  setMembershipSuspended(id: number, suspended: boolean, reason?: string): Promise<Member> {
    return this.repository.setMembershipSuspended(id, suspended, reason);
  }
}